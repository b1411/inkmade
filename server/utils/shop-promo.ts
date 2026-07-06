import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// Промокоды B2B-магазина (Фаза B5). В отличие от платформенных (server/utils/promo.ts)
// код принадлежит магазину (shop_promo_codes). Скидка — расход ВЛАДЕЛЬЦА: ограничена
// его gross (100% наценки + revenue_share_pct% базы) по позициям магазина в корзине,
// иначе база платформы (100−rate)% просела бы. Валидность (срок/лимит/минимум) —
// в SECURITY DEFINER RPC shop_promo_validate (единый источник истины с клиентом).

const round2 = (n: number) => Math.round(n * 100) / 100

export interface ShopLineInput { shopItemId: string; quantity: number }
export interface ShopPromoResult {
  shopId: string
  code: string
  discount: number
  byItem: Record<string, number> // shopItemId → line_discount (сумма скидки на позицию)
}

/**
 * Резолвит промокод магазина по позициям корзины. Возвращает распределённую по
 * позициям скидку (расход владельца, capped его gross) либо null, если код не
 * подходит ни одному магазину из корзины. Без побочных эффектов (used_count — при оплате).
 */
export async function resolveShopPromo(
  svc: SupabaseClient<Database>,
  rawCode: string | null | undefined,
  lines: ShopLineInput[],
): Promise<ShopPromoResult | null> {
  const code = (rawCode ?? '').trim()
  if (!code || !lines.length) return null

  const ids = [...new Set(lines.map(l => l.shopItemId).filter(Boolean))]
  if (!ids.length) return null

  const { data: items } = await svc.from('shop_items')
    .select('id, shop_id, price, markup, is_active').in('id', ids)
  if (!items?.length) return null

  const { data: shops } = await svc.from('shops')
    .select('id, revenue_share_pct').in('id', [...new Set(items.map(i => i.shop_id))])
  const rateOf = new Map((shops ?? []).map(s => [s.id, Number(s.revenue_share_pct) || 0]))

  // группируем позиции по магазину: subtotal (для RPC) и gross владельца (для cap)
  interface Row { shopItemId: string; gross: number }
  interface Agg { subtotal: number; grossTotal: number; rows: Row[] }
  const byShop = new Map<string, Agg>()
  for (const l of lines) {
    const it = items.find(i => i.id === l.shopItemId)
    if (!it || !it.is_active) continue
    const rate = rateOf.get(it.shop_id) ?? 0
    const unitPrice = Number(it.price) + Number(it.markup)
    // gross ДОЛЖЕН совпадать с формулой apply_paid: markup*qty + round(base*qty*rate/100)
    const gross = round2(Number(it.markup) * l.quantity + round2(Number(it.price) * l.quantity * rate / 100))
    const agg = byShop.get(it.shop_id) ?? { subtotal: 0, grossTotal: 0, rows: [] }
    agg.subtotal = round2(agg.subtotal + unitPrice * l.quantity)
    agg.grossTotal = round2(agg.grossTotal + gross)
    agg.rows.push({ shopItemId: l.shopItemId, gross })
    byShop.set(it.shop_id, agg)
  }

  // детерминированно ищем магазин, которому подходит код (по возрастанию shop_id)
  for (const shopId of [...byShop.keys()].sort()) {
    const agg = byShop.get(shopId)!
    const { data: v } = await svc.rpc('shop_promo_validate', {
      p_shop_id: shopId, p_code: code, p_subtotal: agg.subtotal,
    })
    const res = v as { valid?: boolean; code?: string; discount?: number } | null
    if (!res?.valid || !res.discount) continue

    const capped = Math.min(round2(res.discount), agg.grossTotal)
    if (capped <= 0) continue

    // Распределяем скидку по позициям пропорционально gross, остаток — на последнюю.
    // КАЖДАЯ line_discount ограничена своим gross: иначе (при округлении остаток может
    // на копейку превысить gross строки) apply_paid обнулит долю по этой строке —
    // greatest(0, gross − line_discount) — и «лишнее» съест базу платформы, а не
    // владельца (аудит A2/shop-promo). После капа фактически распределённая сумма
    // становится скидкой покупателя (discount = allocated), чтобы уменьшение total
    // покупателя точно совпало с уменьшением доли владельца — база платформы нейтральна.
    const byItem: Record<string, number> = {}
    const sorted = [...agg.rows].sort((a, b) => b.gross - a.gross)
    let allocated = 0
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]!
      const raw = i === sorted.length - 1
        ? round2(capped - allocated)
        : round2(agg.grossTotal > 0 ? (capped * row.gross) / agg.grossTotal : 0)
      const share = Math.min(raw, row.gross)
      byItem[row.shopItemId] = share
      allocated = round2(allocated + share)
    }
    return { shopId, code: res.code ?? code, discount: allocated, byItem }
  }
  return null
}
