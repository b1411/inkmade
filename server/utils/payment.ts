import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '~/types/database.types'

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
// Делегирует в Postgres-функцию apply_paid: одна транзакция + advisory lock
// (аудит C6). Гонка двух webhook больше не даёт двойного списания; идемпотентность
// проверяется по paid_at внутри блокировки.
export async function applyPaid(
  svc: SupabaseClient<Database>,
  orderId: string,
  providerTxn: string,
  rawPayload: unknown,
): Promise<{ alreadyPaid: boolean }> {
  const { data, error } = await svc.rpc('apply_paid', {
    p_order_id: orderId,
    p_provider_txn: providerTxn,
    p_raw: (rawPayload ?? null) as Json,
  })
  if (error) throw new Error(error.message)
  const res = data as { already_paid?: boolean } | null
  return { alreadyPaid: Boolean(res?.already_paid) }
}
