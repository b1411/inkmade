import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// Абстракция платёжного провайдера (§3.4). На старте — mock; ePay/Kaspi
// подключаются как другая реализация этого же интерфейса.
export interface PaymentInitResult {
  payUrl: string
  paymentId: string
}

export interface PaymentProvider {
  name: string
  /** Инициировать платёж: вернуть URL оплаты и id транзакции. */
  createPayment(orderId: string, amount: number, siteUrl: string): PaymentInitResult
}

// Mock-провайдер: «страница оплаты» — наш внутренний экран /checkout/pay/[id].
export const mockProvider: PaymentProvider = {
  name: 'mock',
  createPayment(orderId) {
    return { payUrl: `/checkout/pay/${orderId}`, paymentId: `mock_${orderId}` }
  },
}

export function getPaymentProvider(): PaymentProvider {
  // позже: выбор по env (epay/kaspi). Сейчас всегда mock.
  return mockProvider
}

/**
 * Применить подтверждённую оплату (§9, §5.3). ВЫЗЫВАЕТСЯ ТОЛЬКО СЕРВЕРОМ
 * (webhook с проверенной подписью). Идемпотентна. Service role обходит RLS.
 *  - order.status → paid, paid_at
 *  - payments: запись success
 *  - списание заготовок (stock_movements delta −qty, reason 'order') + variants.stock
 *  - order_status_log: первый переход в paid
 */
export async function applyPaid(
  svc: SupabaseClient<Database>,
  orderId: string,
  providerTxn: string,
  rawPayload: unknown,
): Promise<{ alreadyPaid: boolean }> {
  const { data: order, error } = await svc.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) throw new Error('Заказ не найден')

  // идемпотентность: повторный webhook не дублирует эффекты
  if (order.paid_at) return { alreadyPaid: true }

  const from = order.status

  await svc.from('orders').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    payment_id: providerTxn,
  }).eq('id', orderId)

  await svc.from('payments').insert({
    order_id: orderId,
    provider: 'mock',
    provider_txn: providerTxn,
    amount: order.total,
    status: 'success',
    raw_payload: rawPayload as Database['public']['Tables']['payments']['Insert']['raw_payload'],
  })

  // списание заготовок по позициям (§5.3.1, §8.3)
  const { data: items } = await svc.from('order_items').select('variant_id, quantity').eq('order_id', orderId)
  for (const it of items ?? []) {
    if (!it.variant_id) continue
    await svc.from('stock_movements').insert({
      variant_id: it.variant_id, delta: -it.quantity, reason: 'order', order_id: orderId,
    })
    const { data: v } = await svc.from('variants').select('stock').eq('id', it.variant_id).single()
    if (v) {
      await svc.from('variants').update({ stock: Math.max(0, v.stock - it.quantity) }).eq('id', it.variant_id)
    }
  }

  await svc.from('order_status_log').insert({
    order_id: orderId, from_status: from, to_status: 'paid', actor_id: null, note: 'Оплата подтверждена (webhook)',
  })

  return { alreadyPaid: false }
}
