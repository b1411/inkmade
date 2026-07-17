import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPaymentProvider } from '~~/server/utils/payment'
import { notifyOrder, notifyShopSales } from '~~/server/utils/email'
import { requireUuid } from '~~/server/utils/validation'
import { assertProductionCommerceReady } from '~~/server/utils/readiness'

// Инициация платежа (§9, шаг 2). Ставит order → pending, возвращает URL оплаты.
// paid здесь НЕ ставится (инвариант §10) — только webhook после подтверждения.
export default defineEventHandler(async (event) => {
  assertProductionCommerceReady()
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
    // .rpc() не бросает — ошибку надо проверять руками, иначе клиент получит
    // {free:true} при неподтверждённом заказе (напр. сток разобрали в гонке).
    const { data: paidRes, error: paidErr } = await svc.rpc('apply_paid', {
      p_order_id: order.id,
      p_provider_txn: `free_${order.id}`,
      p_raw: { free: true },
    })
    if (paidErr) {
      throw createError({ statusCode: 409, statusMessage: 'Не удалось подтвердить бесплатный заказ' })
    }
    // Уведомления как в webhook (best-effort, no-op без RESEND-ключа): письмо «принят
    // в работу» + оповещение владельцев B2B-магазинов — только на ПЕРВОМ переходе.
    // Раньше free-order (100% промо) шёл мимо webhook и не слал их вовсе.
    if ((paidRes as { already_paid?: boolean } | null)?.already_paid !== true) {
      await notifyOrder(svc, order.id, 'paid')
      await notifyShopSales(svc, order.id)
    }
    return { payUrl: `/order/${order.id}`, paymentId: `free_${order.id}`, free: true }
  }

  const address = (order.shipping_addr && typeof order.shipping_addr === 'object' && !Array.isArray(order.shipping_addr))
    ? order.shipping_addr as Record<string, unknown>
    : {}
  const provider = getPaymentProvider(config)
  const init = await provider.createPayment({
    orderId: order.id,
    invoiceId: order.payment_invoice_id,
    amount: total,
    siteUrl: config.public.siteUrl || '',
    email: String(address.email || user.email || ''),
    phone: String(address.phone || ''),
    locale: getHeader(event, 'accept-language') || 'ru',
  })

  const { error: updateError } = await svc.from('orders').update({ status: 'pending', payment_id: init.paymentId }).eq('id', orderId)
  if (updateError) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить платёжную сессию' })

  return { payUrl: init.payUrl, paymentId: init.paymentId, provider: provider.name, free: false }
})
