import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'
import type { PrintMode } from '~~/shared/config/print-methods'
import { calcPrice } from '~~/shared/config/pricing'
import { dpiAtMaxSize, DPI_MIN } from '~~/shared/config/zones'
import { LEGAL } from '~~/shared/config/legal'

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

  const body = await readBody<{ items: IncomingItem[]; shippingAddr: Json }>(event)
  const items = body.items
  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Корзина пуста' })
  }

  const svc = serverSupabaseServiceRole<Database>(event)
  const uid = user.id

  // ── пересчёт каждой позиции по БД ──────────────────────────────
  interface Priced { item: IncomingItem; unitPrice: number }
  const priced: Priced[] = []

  for (const it of items) {
    if (!it.productId || !it.variantId || !it.quantity || it.quantity < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная позиция корзины' })
    }

    const { data: product } = await svc.from('products')
      .select('id, base_price, max_print_mm, is_active').eq('id', it.productId).single()
    if (!product || !product.is_active) {
      throw createError({ statusCode: 400, statusMessage: 'Товар недоступен' })
    }

    const { data: variant } = await svc.from('variants')
      .select('id, product_id, material_id, stock').eq('id', it.variantId).single()
    if (!variant || variant.product_id !== it.productId) {
      throw createError({ statusCode: 400, statusMessage: 'Вариант не найден' })
    }

    const { data: material } = await svc.from('materials')
      .select('surcharge, print_mode').eq('id', variant.material_id).single()
    if (!material) throw createError({ statusCode: 400, statusMessage: 'Материал не найден' })

    const placements = it.spec?.placements ?? []
    if (placements.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Дизайн без принта' })
    }

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
      zones: [{ mode, printAreaMm2, zoneAreaMm2 }],
      hasText,
      quantity: 1,
    })
    if (breakdown.unitPrice <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная цена позиции' })
    }
    priced.push({ item: it, unitPrice: breakdown.unitPrice })
  }

  // ── запись: designs → order → order_items (серверная цена) ──────
  const total = priced.reduce((s, p) => s + p.unitPrice * p.item.quantity, 0)

  const { data: order, error: oErr } = await svc.from('orders')
    .insert({ user_id: uid, status: 'created', total, shipping_addr: body.shippingAddr })
    .select('id').single()
  if (oErr || !order) throw createError({ statusCode: 500, statusMessage: 'Не удалось создать заказ' })

  for (const { item, unitPrice } of priced) {
    const { data: design, error: dErr } = await svc.from('designs')
      .insert({ user_id: uid, product_id: item.productId, variant_id: item.variantId, spec: item.spec as unknown as Json })
      .select('id').single()
    if (dErr || !design) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить дизайн' })

    const { error: iErr } = await svc.from('order_items').insert({
      order_id: order.id,
      design_id: design.id,
      variant_id: item.variantId,
      print_method: item.printMethod,
      quantity: item.quantity,
      unit_price: unitPrice,
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
