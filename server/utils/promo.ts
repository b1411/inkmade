import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { evaluatePromo, type PromoResult } from '~~/shared/config/promo'

// Расчёт скидки по промокоду (CRM §6.7). Источник истины — БД, считается СЕРВЕРНО
// (клиентскому коду/сумме доверять нельзя). Чистая логика — в shared/config/promo.ts.

export type { PromoResult }

/** Проверяет код и считает скидку для суммы. Без побочных эффектов. null = не применим. */
export async function computePromoDiscount(
  svc: SupabaseClient<Database>,
  rawCode: string | null | undefined,
  subtotal: number,
): Promise<PromoResult | null> {
  const code = (rawCode ?? '').trim()
  if (!code) return null

  const { data } = await svc.from('promo_codes').select('*').ilike('code', code).maybeSingle()
  if (!data) return null

  return evaluatePromo(data, subtotal, Date.now())
}
