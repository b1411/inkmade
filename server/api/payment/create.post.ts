import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'

// Инициация платежа (§9, шаг 2). Ставит order → pending, возвращает URL оплаты.
// paid здесь НЕ ставится (инвариант §10) — только webhook после подтверждения.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const { orderId } = await readBody<{ orderId: string }>(event)
  if (!orderId) throw createError({ statusCode: 400, statusMessage: 'orderId обязателен' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: order, error } = await svc.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  if (order.user_id !== user.id) throw createError({ statusCode: 403, statusMessage: 'Чужой заказ' })
  if (order.paid_at) throw createError({ statusCode: 409, statusMessage: 'Заказ уже оплачен' })

  const config = useRuntimeConfig()
  const provider = getPaymentProvider()
  const init = provider.createPayment(order.id, Number(order.total), config.public.siteUrl || '')

  await svc.from('orders').update({ status: 'pending', payment_id: init.paymentId }).eq('id', orderId)

  return { payUrl: init.payUrl, paymentId: init.paymentId }
})
