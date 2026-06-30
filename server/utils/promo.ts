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

  // '_' и '%' — спецсимволы ILIKE, а схема промокода допускает '_'. Экранируем,
  // чтобы код матчился буквально, а не как wildcard (иначе 'COD_1' подобрал бы 'CODE1').
  const escaped = code.replace(/[\\%_]/g, '\\$&')
  const { data } = await svc.from('promo_codes').select('*').ilike('code', escaped).maybeSingle()
  if (!data) return null

  return evaluatePromo(data, subtotal, Date.now())
}
