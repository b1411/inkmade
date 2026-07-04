import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { applyPaid } from '~~/server/utils/payment'
import { notifyOrder, notifyShopSales } from '~~/server/utils/email'
import { webhookPayloadSchema, parseOrThrow } from '~~/server/utils/schemas'
import { verifyWebhookSignature } from '~~/server/utils/webhook-crypto'
import { logError } from '~~/server/utils/logger'

// ЕДИНСТВЕННЫЙ триггер paid (§10, инвариант 2). Проверка подписи обязательна.
// Редирект пользователя НЕ является подтверждением оплаты.
export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event)) || ''
  const signature = getHeader(event, 'x-signature') || ''

  const config = useRuntimeConfig()
  const secret = config.paymentWebhookSecret
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'PAYMENT_WEBHOOK_SECRET не настроен' })

  // защита от подделки: проверка HMAC-подписи в постоянном времени (см. webhook-crypto)
  if (!verifyWebhookSignature(raw, signature, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная подпись webhook' })
  }

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Битый payload' }) }
  const payload = parseOrThrow(webhookPayloadSchema, parsed)

  const svc = serverSupabaseServiceRole<Database>(event)
  let result: Awaited<ReturnType<typeof applyPaid>>
  try {
    result = await applyPaid(svc, payload.orderId, payload.providerTxn || 'unknown', payload)
  } catch (e) {
    // критичный денежный путь: фиксируем orderId явно (Nitro-hook не знает его из path)
    await logError('payment/webhook', e, { orderId: payload.orderId, providerTxn: payload.providerTxn })
    throw e
  }
  // письмо «принят в работу» только на первом успешном переходе (не на повторном webhook)
  if (!result.alreadyPaid) {
    await notifyOrder(svc, payload.orderId, 'paid')
    // уведомить владельцев B2B-магазинов о продаже (best-effort, no-op без RESEND-ключа)
    await notifyShopSales(svc, payload.orderId)
  }
  return { ok: true, ...result }
})
