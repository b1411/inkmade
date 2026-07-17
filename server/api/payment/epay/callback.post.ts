import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'
import { syncEpayOrderPayment } from '~~/server/utils/epay-order'
import { verifyOpaqueSecret } from '~~/server/utils/webhook-crypto'
import { notifyOrder, notifyShopSales } from '~~/server/utils/email'
import { logError } from '~~/server/utils/logger'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orderId = String(query.order || '')
  const token = String(query.token || '')
  const config = useRuntimeConfig()
  if (!isUuid(orderId)) throw createError({ statusCode: 400, statusMessage: 'Некорректный заказ' })
  if (!verifyOpaqueSecret(token, config.paymentWebhookSecret || '')) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный токен callback' })
  }

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: order, error } = await svc.from('orders')
    .select('id, total, currency, payment_invoice_id, paid_at')
    .eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })

  try {
    const result = await syncEpayOrderPayment(svc, order, getPaymentProvider(config))
    if (result.paid && !result.alreadyPaid) {
      await notifyOrder(svc, order.id, 'paid')
      await notifyShopSales(svc, order.id)
    }
    return { ok: true, paid: result.paid, status: result.status.status }
  } catch (error) {
    await logError('payment/epay/callback', error, { orderId })
    throw createError({ statusCode: 502, statusMessage: 'Не удалось подтвердить статус ePay' })
  }
})
