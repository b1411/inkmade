import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'
import { requireUuid } from '~~/server/utils/validation'

// Инициация платежа (§9, шаг 2). Ставит order → pending, возвращает URL оплаты.
// paid здесь НЕ ставится (инвариант §10) — только webhook после подтверждения.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ orderId?: string }>(event)
  const orderId = requireUuid(body.orderId, 'заказ')

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: order, error } = await svc.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  if (order.user_id !== user.id) throw createError({ statusCode: 403, statusMessage: 'Чужой заказ' })
  if (order.paid_at) throw createError({ statusCode: 409, statusMessage: 'Заказ уже оплачен' })

  const config = useRuntimeConfig()
  const total = Number(order.total)
  if (!Number.isFinite(total) || total < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректная сумма заказа' })
  }

  // Бесплатный заказ (например 100% промо): провайдеру платить нечего, реальному
  // шлюзу amount=0 слать нельзя. Подтверждаем сервером напрямую через apply_paid
  // (service_role) — §10 не нарушается: paid ставит серверная RPC, а не клиент/клиентская сумма.
  if (total === 0) {
    await svc.rpc('apply_paid', { p_order_id: order.id, p_provider_txn: `free_${order.id}`, p_raw: { free: true } })
    return { payUrl: `/order/${order.id}`, paymentId: `free_${order.id}`, free: true }
  }

  const provider = getPaymentProvider()
  const init = provider.createPayment(order.id, total, config.public.siteUrl || '')

  await svc.from('orders').update({ status: 'pending', payment_id: init.paymentId }).eq('id', orderId)

  return { payUrl: init.payUrl, paymentId: init.paymentId, free: false }
})
