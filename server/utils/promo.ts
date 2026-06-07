import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// Расчёт скидки по промокоду (CRM §6.7). Источник истины — БД, считается СЕРВЕРНО
// (клиентскому коду/сумме доверять нельзя). Preview и оформление используют один расчёт.

export interface PromoResult {
  code: string
  discount: number
  discount_type: string
  discount_value: number
}

/** Проверяет код и считает скидку для суммы. Без побочных эффектов. null = не применим. */
export async function computePromoDiscount(
  svc: SupabaseClient<Database>,
  rawCode: string | null | undefined,
  subtotal: number,
): Promise<PromoResult | null> {
  const code = (rawCode ?? '').trim()
  if (!code) return null

  const { data } = await svc.from('promo_codes').select('*').ilike('code', code).maybeSingle()
  if (!data || !data.active) return null
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null
  if (data.max_uses != null && data.used_count >= data.max_uses) return null
  if (subtotal < Number(data.min_order)) return null

  const raw = data.discount_type === 'percent'
    ? Math.round((subtotal * Number(data.discount_value)) / 100)
    : Number(data.discount_value)
  const discount = Math.max(0, Math.min(raw, subtotal)) // не больше суммы заказа
  if (discount <= 0) return null

  return { code: data.code, discount, discount_type: data.discount_type, discount_value: Number(data.discount_value) }
}
