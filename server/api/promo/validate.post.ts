import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { computePromoDiscount } from '~~/server/utils/promo'

// Предпросмотр скидки по промокоду на checkout (CRM §6.7). Возвращает скидку для суммы.
// Авторитетный расчёт всё равно повторяется при создании заказа.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ code?: string; subtotal?: number }>(event)
  const subtotal = Number(body.subtotal)
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректная сумма' })
  }

  const svc = serverSupabaseServiceRole<Database>(event)
  const result = await computePromoDiscount(svc, body.code, subtotal)
  if (!result) return { valid: false }
  return { valid: true, ...result }
})
