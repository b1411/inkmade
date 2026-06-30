import { createHmac } from 'node:crypto'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// DEV-ONLY: имитирует платёжного провайдера. Формирует подписанный payload и
// вызывает реальный webhook (§10) — так поток оплаты тестируется честно,
// с проверкой подписи. В проде заменяется реальным провайдером.
export default defineEventHandler(async (event) => {
  // DEV-ONLY guard: эндпоинт даёт обходной путь к paid — в проде он недоступен (§10, инвариант 2).
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const { orderId } = await readBody<{ orderId: string }>(event)
  if (!orderId) throw createError({ statusCode: 400, statusMessage: 'orderId обязателен' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: order, error } = await svc.from('orders').select('id, user_id, payment_id, status, total').eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  if (order.user_id !== user.id) throw createError({ statusCode: 403, statusMessage: 'Чужой заказ' })

  const config = useRuntimeConfig()
  const secret = config.paymentWebhookSecret
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'PAYMENT_WEBHOOK_SECRET не настроен' })
  // amount в подписанном payload → apply_paid сверит его с orders.total (как реальный шлюз)
  const raw = JSON.stringify({ orderId, providerTxn: order.payment_id || `mock_${orderId}`, amount: order.total })
  const signature = createHmac('sha256', secret).update(raw).digest('hex')

  // вызываем настоящий webhook с подписью (имитация провайдера)
  const result = await $fetch('/api/payment/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': signature },
    body: raw,
  })
  return result
})
