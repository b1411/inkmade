import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'
import type { PrintMode, PrintMethod } from '~~/shared/config/print-methods'
import { METHOD_SURCHARGE } from '~~/shared/config/print-methods'
import { calcPrice } from '~~/shared/config/pricing'
import { LEGAL } from '~~/shared/config/legal'
import { computePromoDiscount } from '~~/server/utils/promo'
import { orderCreateSchema, parseOrThrow } from '~~/server/utils/schemas'

// Создание заказа из корзины НА СЕРВЕРЕ (§9, аудит C7).
// Цена пересчитывается по БД — клиентскому unit_price из localStorage доверять нельзя
// (подмена → заказ на 1 тенге). DPI больше не блокирует (принимаем любой эскиз,
// качество согласуется оператором). paid здесь НЕ ставится (инвариант §10).

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  // Zod-валидация тела: uuid позиций, геометрия плейсментов, email/телефон адреса,
  // формат промокода — всё на границе. Бизнес-инварианты (цена/DPI) — ниже по БД.
  const body = parseOrThrow(orderCreateSchema, await readBody(event))
  const items = body.items
  const shippingAddr = body.shippingAddr
  type Item = (typeof items)[number]

  const svc = serverSupabaseServiceRole<Database>(event)
  const uid = user.id

  // Файлы дизайна (превью, печатные файлы, ассеты принтов) должны лежать в нашем
  // Storage — иначе в designs попадёт произвольный URL, который покажется оператору
  // (anti-SSRF / защита от подмены §17.3). Проверяем префикс публичного бакета.
  const cfg = useRuntimeConfig(event)
  const supaUrl = String((cfg.public as { supabase?: { url?: string } })?.supabase?.url || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const storagePrefix = supaUrl ? `${supaUrl}/storage/v1/object/public/` : ''
  function assertOwnStorageUrl(url: string | null | undefined, label: string): void {
    if (!url || !storagePrefix) return
    if (!url.startsWith(storagePrefix)) {
      throw createError({ statusCode: 400, statusMessage: `Недопустимый источник файла (${label})` })
    }
  }

  // ── пересчёт каждой позиции по БД ──────────────────────────────
  interface Priced { item: Item; unitPrice: number; unitCost: number }
  const priced: Priced[] = []
  // Проверка остатка (анти-оверселл): суммируем потребность по варианту и текущий
  // остаток. Это дружелюбный pre-check ДО оплаты — авторитетная атомарная проверка
  // под row-lock варианта живёт в apply_paid (миграция 0052). Между этой проверкой
  // и оплатой остаток может измениться, поэтому финальное слово — за apply_paid.
  const needByVariant = new Map<string, number>()
  const stockByVariant = new Map<string, number>()

  for (const it of items) {
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
    needByVariant.set(it.variantId, (needByVariant.get(it.variantId) ?? 0) + it.quantity)
    stockByVariant.set(it.variantId, Number(variant.stock) || 0)

    const { data: material } = await svc.from('materials')
      .select('surcharge, print_mode, print_method').eq('id', variant.material_id).single()
    if (!material) throw createError({ statusCode: 400, statusMessage: 'Материал не найден' })

    const placements = it.spec?.placements ?? []
    if (placements.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Дизайн без принта' })
    }
    // геометрия плейсментов (конечные неотрицательные мм) уже проверена Zod-схемой

    // источники файлов должны принадлежать нашему Storage
    assertOwnStorageUrl(it.spec?.composition_url, 'превью')
    for (const f of it.spec?.print_files ?? []) assertOwnStorageUrl(f.url, 'печатный файл')
    for (const p of placements) {
      assertOwnStorageUrl(p.asset_url, 'принт')
      assertOwnStorageUrl((p as { source_file_url?: string }).source_file_url, 'исходник')
    }

    // DPI больше НЕ блокирует заказ (бизнес-решение): принимаем эскиз любого
    // разрешения, при низком качестве оператор связывается с клиентом перед
    // печатью. Исходник и natural_w/h уходят в spec — оператор видит реальное
    // качество в CRM. Раньше здесь был жёсткий 422 по DPI (§24 инв.1, снят).

    // мультизона (§7.1): печать считается по каждой занятой зоне отдельно.
    // Режим берём ТОЛЬКО из материала по БД — клиентскому spec.print_mode
    // доверять нельзя (можно навязать дешёвую/дорогую ставку).
    const mode: PrintMode = material.print_mode as PrintMode
    const byZone = new Map<string, typeof placements>()
    for (const p of placements) {
      const zn = p.zone ?? '__none__'
      byZone.set(zn, [...(byZone.get(zn) ?? []), p])
    }
    const zonesForPrice: { mode: PrintMode; printAreaMm2: number; zoneAreaMm2: number }[] = []
    for (const [zn, pls] of byZone) {
      const { data: zoneRow } = zn !== '__none__'
        ? await svc.from('print_zones').select('max_width_mm, max_height_mm')
            .eq('product_id', it.productId).eq('name', zn).limit(1).maybeSingle()
        : { data: null }
      const zoneAreaMm2 = (Number(zoneRow?.max_width_mm) || 0) * (Number(zoneRow?.max_height_mm) || 0)
      const printAreaMm2 = Math.min(
        zoneAreaMm2 || Infinity,
        pls.reduce((s, p) => s + (Number(p.width_mm) || 0) * (Number(p.height_mm) || 0), 0),
      )
      zonesForPrice.push({ mode, printAreaMm2, zoneAreaMm2 })
    }
    const hasText = placements.some(p => p.source === 'text' || p.text != null)

    const isSilkscreen = material.print_method === 'silkscreen'
    const colorCount = Math.max(0, Math.round(Number(it.spec?.color_count) || 0))
    // шелкография: каждый цвет = отдельный трафарет; без числа цветов цена неполна
    if (isSilkscreen && colorCount < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Для шелкографии укажите число цветов в макете' })
    }
    const breakdown = calcPrice({
      basePrice: Number(product.base_price) || 0,
      materialSurcharge: Number(material.surcharge) || 0,
      methodSurcharge: METHOD_SURCHARGE[material.print_method as PrintMethod] ?? 0,
      zones: zonesForPrice,
      hasText,
      quantity: 1,
      perColorPricing: isSilkscreen,
      colorCount,
    })
    if (breakdown.unitPrice <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная цена позиции' })
    }
    priced.push({ item: it, unitPrice: breakdown.unitPrice, unitCost: Number(variant.blank_cost) || 0 })
  }

  // анти-оверселл: ни одна позиция не должна превышать текущий остаток варианта
  for (const [vid, need] of needByVariant) {
    if (need > (stockByVariant.get(vid) ?? 0)) {
      throw createError({ statusCode: 409, statusMessage: 'Недостаточно товара на складе — обновите корзину' })
    }
  }

  // ── запись: designs → order → order_items (серверная цена) ──────
  const subtotal = priced.reduce((s, p) => s + p.unitPrice * p.item.quantity, 0)

  // промокод (§6.7): скидка считается по БД read-only (валидность/лимит/срок —
  // в evaluatePromo). Учёт использования (used_count++) НЕ здесь, а при оплате,
  // в apply_paid (миграция 0055) — иначе брошенная корзина «сжигала» код.
  let discount = 0
  let promoCode: string | null = null
  if (body.promoCode) {
    const promo = await computePromoDiscount(svc, body.promoCode, subtotal)
    if (promo) { discount = promo.discount; promoCode = promo.code }
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

  // Нет транзакции через PostgREST → полу-успех оставил бы заказ-сироту. Пишем
  // designs/order_items/consents в try; при любом сбое откатываем заказ (каскад
  // order_items) + созданные дизайны. Согласия §24 — с проверкой ошибки (юр. точка).
  const createdDesignIds: string[] = []
  try {
    for (const { item, unitPrice, unitCost } of priced) {
      const { data: design, error: dErr } = await svc.from('designs')
        .insert({
          user_id: uid,
          product_id: item.productId,
          variant_id: item.variantId,
          spec: item.spec as unknown as Json,
          // превью «для глаз» из скриншота композиции (§13.2) — для галереи и шаринга
          preview_url: item.spec?.composition_url ?? null,
          // печатный файл (§13.2, «для печати»): первая зона → designs.print_file_url,
          // все зоны лежат в spec.print_files. Решает проблему шрифтов в цеху.
          print_file_url: item.spec?.print_files?.[0]?.url ?? null,
        })
        .select('id').single()
      if (dErr || !design) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить дизайн' })
      createdDesignIds.push(design.id)

      // принт из библиотеки → атрибуция роялти владельцу-дизайнеру (CRM §7.3, §8.4).
      // Anti-fraud: роялти только за АКТИВНЫЙ принт, РЕАЛЬНО использованный в дизайне
      // (его file_url присутствует среди ассетов плейсментов) — нельзя начислить
      // роялти произвольному дизайнеру, подставив чужой print_id.
      let printId: string | null = null
      let printOwnerId: string | null = null
      if (item.spec?.print_id) {
        const { data: pl } = await svc.from('print_library')
          .select('id, owner_id, file_url, is_active').eq('id', item.spec.print_id).maybeSingle()
        const usedInDesign = !!pl && (item.spec?.placements ?? []).some(p => p.asset_url === pl.file_url)
        if (pl && pl.is_active && usedInDesign) { printId = pl.id; printOwnerId = pl.owner_id }
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

    // фиксация согласий (§24): ToS + Privacy + копирайт. Ошибка вставки больше НЕ
    // проглатывается — заказ без юр. согласия не проходит.
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
    const { error: cErr } = await svc.from('user_consents').insert([
      { user_id: uid, order_id: order.id, consent_type: 'tos', doc_version: LEGAL.tosVersion, ip },
      { user_id: uid, order_id: order.id, consent_type: 'privacy', doc_version: LEGAL.privacyVersion, ip },
      { user_id: uid, order_id: order.id, consent_type: 'copyright', doc_version: LEGAL.tosVersion, ip },
    ])
    if (cErr) throw createError({ statusCode: 500, statusMessage: 'Не удалось зафиксировать согласия' })
  } catch (err) {
    // откат сирот: заказ (каскадит order_items) + созданные дизайны
    await svc.from('orders').delete().eq('id', order.id)
    if (createdDesignIds.length) await svc.from('designs').delete().in('id', createdDesignIds)
    throw err
  }

  return { orderId: order.id, total }
})
