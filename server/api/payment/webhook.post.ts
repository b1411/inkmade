import { createHmac, timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { applyPaid } from '~~/server/utils/payment'

// ЕДИНСТВЕННЫЙ триггер paid (§10, инвариант 2). Проверка подписи обязательна.
// Редирект пользователя НЕ является подтверждением оплаты.
export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event)) || ''
  const signature = getHeader(event, 'x-signature') || ''

  const config = useRuntimeConfig()
  const secret = config.paymentWebhookSecret || 'dev-mock-secret'
  const expected = createHmac('sha256', secret).update(raw).digest('hex')

  // защита от подделки: сравнение в постоянном времени
  const ok = signature.length === expected.length
    && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Неверная подпись webhook' })

  let payload: { orderId?: string; providerTxn?: string }
  try { payload = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Битый payload' }) }
  if (!payload.orderId) throw createError({ statusCode: 400, statusMessage: 'orderId обязателен' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const result = await applyPaid(svc, payload.orderId, payload.providerTxn || 'unknown', payload)
  return { ok: true, ...result }
})
