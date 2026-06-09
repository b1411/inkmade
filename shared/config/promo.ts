// INKMADE — чистая логика промокода (§6.7). Без зависимостей (тестируема изолированно).
// Серверный util (server/utils/promo.ts) подтягивает строку из БД и зовёт evaluatePromo.

export interface PromoRow {
  code: string
  discount_type: string // 'percent' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number | null
  used_count: number
  active: boolean
  expires_at: string | null
}

export interface PromoResult {
  code: string
  discount: number
  discount_type: string
  discount_value: number
}

/**
 * Считает скидку для суммы заказа. Возвращает null, если код неприменим
 * (выключен, просрочен, исчерпан лимит, сумма ниже минимума, нулевая скидка).
 * @param nowMs — текущее время в мс (передаётся явно для детерминизма/тестов)
 */
export function evaluatePromo(promo: PromoRow, subtotal: number, nowMs: number): PromoResult | null {
  if (!promo.active) return null
  if (promo.expires_at && new Date(promo.expires_at).getTime() < nowMs) return null
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) return null
  if (subtotal < Number(promo.min_order)) return null

  const raw = promo.discount_type === 'percent'
    ? Math.round((subtotal * Number(promo.discount_value)) / 100)
    : Number(promo.discount_value)
  const discount = Math.max(0, Math.min(raw, subtotal)) // не больше суммы заказа
  if (discount <= 0) return null

  return { code: promo.code, discount, discount_type: promo.discount_type, discount_value: Number(promo.discount_value) }
}
