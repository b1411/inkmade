import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'
import { syncEpayOrderPayment } from '~~/server/utils/epay-order'
import { notifyOrder, notifyShopSales } from '~~/server/utils/email'
import { requireUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })
  const body = await readBody<{ orderId?: string }>(event)
  const orderId = requireUuid(body.orderId, 'заказ')
  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: order, error } = await svc.from('orders')
    .select('id, user_id, total, currency, payment_invoice_id, paid_at, status')
    .eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  if (order.user_id !== user.id) throw createError({ statusCode: 403, statusMessage: 'Чужой заказ' })
  if (order.paid_at) return { paid: true, status: order.status }

  const provider = getPaymentProvider()
  if (provider.name !== 'epay') return { paid: false, status: order.status }
  const result = await syncEpayOrderPayment(svc, order, provider)
  if (result.paid && !result.alreadyPaid) {
    await notifyOrder(svc, order.id, 'paid')
    await notifyShopSales(svc, order.id)
  }
  return { paid: result.paid, status: result.status.status }
})
