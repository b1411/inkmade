import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'
import { requireUuid } from '~~/server/utils/validation'
import { logError } from '~~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })
  const body = await readBody<{ orderId?: string; note?: string }>(event)
  const orderId = requireUuid(body.orderId, 'заказ')
  const note = String(body.note || '').trim().slice(0, 500) || undefined
  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Только администратор' })

  const { data: order, error } = await svc.from('orders')
    .select('id, total, paid_at, payment_id, status')
    .eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  if (!order.paid_at || !order.payment_id) throw createError({ statusCode: 409, statusMessage: 'Заказ не был оплачен' })
  if (order.status === 'refunded') return { already_refunded: true }

  let providerRefund: unknown = null
  if (!order.payment_id.startsWith('free_')) {
    const provider = getPaymentProvider()
    if (!provider.refund) throw createError({ statusCode: 501, statusMessage: 'Провайдер не поддерживает возвраты' })
    try {
      providerRefund = await provider.refund(order.payment_id, Number(order.total))
    } catch (error) {
      await logError('payment/refund/provider', error, { orderId, transactionId: order.payment_id })
      throw createError({ statusCode: 502, statusMessage: 'Банк не подтвердил возврат. Статус заказа не изменён.' })
    }
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error: refundError } = await client.rpc('refund_order', { p_order_id: orderId, p_note: note })
  if (refundError) {
    await logError('payment/refund/reconcile', refundError, { orderId, providerRefund })
    throw createError({
      statusCode: 500,
      statusMessage: 'Возврат в банке выполнен, но внутренний статус требует сверки. Инцидент записан.',
    })
  }
  return { result: data, providerRefund }
})
