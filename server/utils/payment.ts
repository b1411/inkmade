import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '~/types/database.types'

export type PaymentProviderName = 'mock' | 'epay'
export type EpayEnvironment = 'test' | 'production'

export interface PaymentInitResult {
  payUrl: string
  paymentId: string
  raw?: unknown
}

export interface PaymentContext {
  orderId: string
  invoiceId: string
  amount: number
  siteUrl: string
  email: string
  phone: string
  locale: string
}

export interface PaymentStatusResult {
  paid: boolean
  status: string
  transactionId?: string
  invoiceId?: string
  amount?: number
  currency?: string
  raw: unknown
}

export interface PaymentProvider {
  name: PaymentProviderName
  createPayment(context: PaymentContext): Promise<PaymentInitResult>
  checkStatus?(invoiceId: string): Promise<PaymentStatusResult>
  refund?(transactionId: string, amount?: number): Promise<unknown>
}

export interface EpayConfig {
  environment: EpayEnvironment
  clientId: string
  clientSecret: string
  shopId: string
  accountId: string
  terminalId?: string
  callbackSecret: string
}

interface EpayTokenResponse {
  access_token?: string
  expires_in?: number
}

interface EpayInvoiceResponse {
  id?: string | number
  invoice_url?: string
  url?: string
}

interface EpayStatusResponse {
  resultCode?: string | number
  statusName?: string
  invoiceID?: string | number
  amount?: number | string
  currency?: string
  transaction?: { id?: string | number; statusName?: string }
}

export function epayEndpoints(environment: EpayEnvironment) {
  if (environment === 'production') {
    return {
      oauth: 'https://epay-oauth.homebank.kz/oauth2/token',
      api: 'https://epay-api.homebank.kz',
    }
  }
  return {
    oauth: 'https://test-epay-oauth.epayment.kz/oauth2/token',
    api: 'https://test-epay-api.epayment.kz',
  }
}

function required(value: unknown, name: string): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) throw new Error(`${name} is not configured`)
  return normalized
}

export function readEpayConfig(config: Record<string, unknown>): EpayConfig {
  const environment = config.epayEnvironment === 'production' ? 'production' : 'test'
  return {
    environment,
    clientId: required(config.epayClientId, 'EPAY_CLIENT_ID'),
    clientSecret: required(config.epayClientSecret, 'EPAY_CLIENT_SECRET'),
    shopId: required(config.epayShopId, 'EPAY_SHOP_ID'),
    accountId: required(config.epayAccountId, 'EPAY_ACCOUNT_ID'),
    terminalId: String(config.epayTerminalId ?? '').trim() || undefined,
    callbackSecret: required(config.paymentWebhookSecret, 'PAYMENT_WEBHOOK_SECRET'),
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('8') && digits.length === 11) return `+7${digits.slice(1)}`
  if (digits.startsWith('7')) return `+${digits}`
  return `+${digits}`
}

function normalizeLocale(locale: string): 'rus' | 'kaz' | 'eng' {
  if (locale.toLowerCase().startsWith('kk') || locale.toLowerCase().startsWith('kz')) return 'kaz'
  if (locale.toLowerCase().startsWith('en')) return 'eng'
  return 'rus'
}

function safeSiteUrl(value: string): string {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('NUXT_PUBLIC_SITE_URL must use http or https')
  return url.origin
}

async function epayToken(config: EpayConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'payment',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })
  if (config.terminalId) body.set('terminal', config.terminalId)

  const response = await $fetch<EpayTokenResponse>(epayEndpoints(config.environment).oauth, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!response.access_token) throw new Error('ePay OAuth did not return access_token')
  return response.access_token
}

export function createEpayProvider(config: EpayConfig): PaymentProvider {
  const endpoints = epayEndpoints(config.environment)
  return {
    name: 'epay',
    async createPayment(context) {
      const token = await epayToken(config)
      const siteUrl = safeSiteUrl(context.siteUrl)
      const callback = new URL('/api/payment/epay/callback', siteUrl)
      callback.searchParams.set('order', context.orderId)
      callback.searchParams.set('token', config.callbackSecret)
      const backLink = new URL(`/checkout/pay/${context.orderId}`, siteUrl)
      backLink.searchParams.set('provider', 'epay')
      backLink.searchParams.set('returned', '1')
      const failureBackLink = new URL(backLink)
      failureBackLink.searchParams.set('cancelled', '1')

      const response = await $fetch<EpayInvoiceResponse>(`${endpoints.api}/invoice`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: {
          shop_id: config.shopId,
          account_id: config.accountId,
          invoice_id: context.invoiceId,
          amount: context.amount,
          language: normalizeLocale(context.locale),
          description: `INKMADE order ${context.orderId}`.slice(0, 125),
          expire_period: '1d',
          recipient_contact: context.email,
          recipient_contact_sms: normalizePhone(context.phone),
          currency: 'KZT',
          post_link: callback.toString(),
          failure_post_link: callback.toString(),
          back_link: backLink.toString(),
          failure_back_link: failureBackLink.toString(),
        },
      })
      const payUrl = response.invoice_url || response.url
      if (!payUrl) throw new Error('ePay invoice did not return invoice_url')
      return { payUrl, paymentId: `epay_invoice_${context.invoiceId}`, raw: response }
    },
    async checkStatus(invoiceId) {
      const token = await epayToken(config)
      const raw = await $fetch<EpayStatusResponse>(`${endpoints.api}/check-status/payment/transaction/${encodeURIComponent(invoiceId)}`, {
        headers: { authorization: `Bearer ${token}` },
      })
      const status = String(raw.statusName || raw.transaction?.statusName || 'UNKNOWN').toUpperCase()
      return {
        paid: String(raw.resultCode) === '100' && status === 'CHARGE',
        status,
        transactionId: raw.transaction?.id == null ? undefined : String(raw.transaction.id),
        invoiceId: raw.invoiceID == null ? undefined : String(raw.invoiceID),
        amount: raw.amount == null ? undefined : Number(raw.amount),
        currency: raw.currency,
        raw,
      }
    },
    async refund(transactionId, amount) {
      const token = await epayToken(config)
      return await $fetch(`${endpoints.api}/operation/${encodeURIComponent(transactionId)}/refund`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: amount == null ? {} : { amount },
      })
    },
  }
}

export const mockProvider: PaymentProvider = {
  name: 'mock',
  async createPayment(context) {
    return { payUrl: `/checkout/pay/${context.orderId}`, paymentId: `mock_${context.orderId}` }
  },
  async checkStatus(invoiceId) {
    return { paid: false, status: 'MOCK', invoiceId, raw: { provider: 'mock' } }
  },
  async refund(transactionId, amount) {
    return { provider: 'mock', transactionId, amount, refunded: true }
  },
}

export function getPaymentProvider(config = useRuntimeConfig()): PaymentProvider {
  const provider = String(config.paymentProvider || '').toLowerCase()
  if (provider === 'epay') return createEpayProvider(readEpayConfig(config as unknown as Record<string, unknown>))
  if (provider === 'mock' && import.meta.dev) return mockProvider
  throw new Error('Production payment provider is not configured. Set PAYMENT_PROVIDER=epay.')
}

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
  const provider = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
    ? String((rawPayload as Record<string, unknown>).provider || '')
    : ''
  // A replayed bank callback must stay idempotent all the way through the
  // fiscalization boundary. Once apply_paid reports an already-paid order,
  // never replace a real KKM/OFD receipt with the temporary pending marker.
  if (provider && !res?.already_paid) {
    await svc.from('orders').update({
      fiscal_receipt: {
        status: 'pending_fiscalization',
        provider,
        provider_txn: providerTxn,
        note: 'Онлайн-ККМ/ОФД должна фискализировать платёж отдельной интеграцией',
      },
    }).eq('id', orderId)
  }
  return { alreadyPaid: Boolean(res?.already_paid) }
}
