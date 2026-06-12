import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'
import type { PrintMode, PrintMethod } from '~~/shared/config/print-methods'
import { METHOD_SURCHARGE } from '~~/shared/config/print-methods'
import { calcPrice } from '~~/shared/config/pricing'
import { dpiAtMaxSize, DPI_MIN } from '~~/shared/config/zones'
import { LEGAL } from '~~/shared/config/legal'
import { computePromoDiscount } from '~~/server/utils/promo'
import { validateShippingAddr, assertPlacementGeometry } from '~~/server/utils/validation'

// Создание заказа из корзины НА СЕРВЕРЕ (§9, аудит C7/H2).
// Цена и DPI проверяются по БД — клиентскому unit_price из localStorage доверять нельзя
// (подмена → заказ на 1 тенге). paid здесь НЕ ставится (инвариант §10).

interface SpecPlacement {
  zone?: string
  width_mm?: number
  height_mm?: number
  natural_w?: number
  natural_h?: number
  source?: string
  text?: string
}
interface DesignSpec {
  placements?: SpecPlacement[]
  print_mode?: PrintMode
  composition_url?: string
  print_id?: string | null
}
interface IncomingItem {
  productId: string
  variantId: string
  printMethod: string | null
  spec: DesignSpec
  quantity: number
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{
    items: IncomingItem[]
    shippingAddr: Json
    promoCode?: string
    gift?: { recipient?: string; message?: string; hidePrice?: boolean }
  }>(event)
  const items = body.items
  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Корзина пуста' })
  }
  // структурная валидация адреса (email/телефон) — иначе уведомления и обработка падают на мусоре
  const shippingAddr = validateShippingAddr(body.shippingAddr)

  const svc = serverSupabaseServiceRole<Database>(event)
  const uid = user.id

  // ── пересчёт каждой позиции по БД ──────────────────────────────
  interface Priced { item: IncomingItem; unitPrice: number; unitCost: number }
  const priced: Priced[] = []

  for (const it of items) {
    if (!it.productId || !it.variantId || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 1000) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная позиция корзины' })
    }

    const { data: product } = await svc.from('products')
      .select('id, base_price, max_print_mm, is_active').eq('id', it.productId).single()
    if (!product || !product.is_active) {
      throw createError({ statusCode: 400, statusMessage: 'Товар недоступен' })
    }

    const { data: variant } = await svc.from('variants')
      .select('id, product_id, material_id, stock, blank_cost').eq('id', it.variantId).single()
    if (!variant || variant.product_id !== it.productId) {
      throw createError({ statusCode: 400, statusMessage: 'Вариант не найден' })
    }

    const { data: material } = await svc.from('materials')
      .select('surcharge, print_mode, print_method').eq('id', variant.material_id).single()
    if (!material) throw createError({ statusCode: 400, statusMessage: 'Материал не найден' })

    const placements = it.spec?.placements ?? []
    if (placements.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Дизайн без принта' })
    }
    // отсекаем NaN/Infinity/отрицательные размеры — иначе искажается цена и DPI
    for (const p of placements) assertPlacementGeometry(p)

    // H2: DPI-валидация от МАКСИМАЛЬНОГО размера изделия (§24 инв.1), серверная
    const maxPrint = product.max_print_mm as { width?: number; height?: number } | null
    if (maxPrint?.width && maxPrint?.height) {
      for (const p of placements) {
        if (p.natural_w && p.natural_h) {
          const dpi = dpiAtMaxSize(p.natural_w, p.natural_h, { width: maxPrint.width, height: maxPrint.height })
          if (dpi < DPI_MIN) {
            throw createError({ statusCode: 422, statusMessage: `Низкое разрешение принта (${dpi} DPI, нужно от ${DPI_MIN})` })
          }
        }
      }
    }

    // зона из spec → площадь зоны для расчёта (§5.5)
    const zoneName = placements[0]?.zone ?? null
    const { data: zoneRow } = zoneName
      ? await svc.from('print_zones').select('max_width_mm, max_height_mm')
          .eq('product_id', it.productId).eq('name', zoneName).limit(1).maybeSingle()
      : { data: null }
    const zoneAreaMm2 = (Number(zoneRow?.max_width_mm) || 0) * (Number(zoneRow?.max_height_mm) || 0)

    const mode: PrintMode = (it.spec?.print_mode as PrintMode) ?? (material.print_mode as PrintMode)
    const printAreaMm2 = Math.min(
      zoneAreaMm2 || Infinity,
      placements.reduce((s, p) => s + (Number(p.width_mm) || 0) * (Number(p.height_mm) || 0), 0),
    )
    const hasText = placements.some(p => p.source === 'text' || p.text != null)

    const breakdown = calcPrice({
      basePrice: Number(product.base_price) || 0,
      materialSurcharge: Number(material.surcharge) || 0,
      methodSurcharge: METHOD_SURCHARGE[material.print_method as PrintMethod] ?? 0,
      zones: [{ mode, printAreaMm2, zoneAreaMm2 }],
      hasText,
      quantity: 1,
    })
    if (breakdown.unitPrice <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная цена позиции' })
    }
    priced.push({ item: it, unitPrice: breakdown.unitPrice, unitCost: Number(variant.blank_cost) || 0 })
  }

  // ── запись: designs → order → order_items (серверная цена) ──────
  const subtotal = priced.reduce((s, p) => s + p.unitPrice * p.item.quantity, 0)

  // промокод (§6.7): скидка считается по БД; учёт использования атомарный RPC
  let discount = 0
  let promoCode: string | null = null
  if (body.promoCode) {
    const promo = await computePromoDiscount(svc, body.promoCode, subtotal)
    if (promo) {
      const { data: ok } = await svc.rpc('bump_promo_use', { p_code: promo.code })
      if (ok) { discount = promo.discount; promoCode = promo.code }
    }
  }
  const total = Math.max(0, subtotal - discount)

  const gift = body.gift
  const isGift = !!gift && (!!gift.recipient || !!gift.message)
  const { data: order, error: oErr } = await svc.from('orders')
    .insert({
      user_id: uid, status: 'created', total, discount, promo_code: promoCode, shipping_addr: shippingAddr as unknown as Json,
      is_gift: isGift,
      gift_recipient: isGift ? (gift?.recipient ?? null) : null,
      gift_message: isGift ? (gift?.message ?? null) : null,
      gift_hide_price: isGift ? !!gift?.hidePrice : false,
    })
    .select('id').single()
  if (oErr || !order) throw createError({ statusCode: 500, statusMessage: 'Не удалось создать заказ' })

  for (const { item, unitPrice, unitCost } of priced) {
    const { data: design, error: dErr } = await svc.from('designs')
      .insert({
        user_id: uid,
        product_id: item.productId,
        variant_id: item.variantId,
        spec: item.spec as unknown as Json,
        // превью «для глаз» из скриншота композиции (§13.2) — для галереи и шаринга
        preview_url: item.spec?.composition_url ?? null,
      })
      .select('id').single()
    if (dErr || !design) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить дизайн' })

    // принт из библиотеки → атрибуция роялти владельцу-дизайнеру (CRM §7.3, §8.4)
    let printId: string | null = null
    let printOwnerId: string | null = null
    if (item.spec?.print_id) {
      const { data: pl } = await svc.from('print_library')
        .select('id, owner_id').eq('id', item.spec.print_id).maybeSingle()
      if (pl) { printId = pl.id; printOwnerId = pl.owner_id }
    }

    const { error: iErr } = await svc.from('order_items').insert({
      order_id: order.id,
      design_id: design.id,
      variant_id: item.variantId,
      print_method: item.printMethod,
      quantity: item.quantity,
      unit_price: unitPrice,
      unit_cost: unitCost,
      print_id: printId,
      print_owner_id: printOwnerId,
    })
    if (iErr) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить позицию' })
  }

  // фиксация согласий (§24): ToS + Privacy + перенос ответственности за копирайт.
  // Это критическая юр. точка — фиксируется на сервере перед оплатой, гарантированно.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  await svc.from('user_consents').insert([
    { user_id: uid, order_id: order.id, consent_type: 'tos', doc_version: LEGAL.tosVersion, ip },
    { user_id: uid, order_id: order.id, consent_type: 'privacy', doc_version: LEGAL.privacyVersion, ip },
    { user_id: uid, order_id: order.id, consent_type: 'copyright', doc_version: LEGAL.tosVersion, ip },
  ])

  return { orderId: order.id, total }
})
