import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { PaymentProvider, PaymentStatusResult } from '~~/server/utils/payment'
import { applyPaid } from '~~/server/utils/payment'

interface PayableOrder {
  id: string
  total: number
  currency: string
  payment_invoice_id: string
  paid_at: string | null
}

export async function syncEpayOrderPayment(
  svc: SupabaseClient<Database>,
  order: PayableOrder,
  provider: PaymentProvider,
): Promise<{ paid: boolean; alreadyPaid: boolean; status: PaymentStatusResult }> {
  if (!provider.checkStatus) throw new Error('Payment provider does not support status checks')
  const status = await provider.checkStatus(order.payment_invoice_id)
  if (!status.paid) return { paid: false, alreadyPaid: Boolean(order.paid_at), status }

  const paidAmount = Number(status.amount)
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - Number(order.total)) > 0.001) {
    throw new Error(`ePay amount mismatch for order ${order.id}`)
  }
  if (String(status.currency || '').toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error(`ePay currency mismatch for order ${order.id}`)
  }
  if (status.invoiceId && status.invoiceId !== order.payment_invoice_id) {
    throw new Error(`ePay invoice mismatch for order ${order.id}`)
  }
  if (!status.transactionId) throw new Error(`ePay transaction id missing for order ${order.id}`)

  const result = await applyPaid(svc, order.id, status.transactionId, {
    provider: 'epay',
    amount: paidAmount,
    currency: status.currency,
    invoiceId: order.payment_invoice_id,
    status: status.status,
    response: status.raw,
  })
  return { paid: true, alreadyPaid: result.alreadyPaid, status }
}
