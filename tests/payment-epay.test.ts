import { describe, expect, it } from 'vitest'
import { epayEndpoints, readEpayConfig } from '../server/utils/payment'
import { verifyOpaqueSecret } from '../server/utils/webhook-crypto'

describe('Halyk ePay configuration', () => {
  it('uses the official isolated test and production hosts', () => {
    expect(epayEndpoints('test')).toEqual({
      oauth: 'https://test-epay-oauth.epayment.kz/oauth2/token',
      api: 'https://test-epay-api.epayment.kz',
    })
    expect(epayEndpoints('production')).toEqual({
      oauth: 'https://epay-oauth.homebank.kz/oauth2/token',
      api: 'https://epay-api.homebank.kz',
    })
  })

  it('fails fast when merchant secrets are incomplete', () => {
    expect(() => readEpayConfig({ epayEnvironment: 'test' })).toThrow('EPAY_CLIENT_ID')
  })

  it('does not expose or silently replace merchant configuration', () => {
    expect(readEpayConfig({
      epayEnvironment: 'production',
      epayClientId: 'client',
      epayClientSecret: 'secret',
      epayShopId: 'shop',
      epayAccountId: 'account',
      epayTerminalId: 'terminal',
      paymentWebhookSecret: 'callback-secret',
    })).toEqual({
      environment: 'production',
      clientId: 'client',
      clientSecret: 'secret',
      shopId: 'shop',
      accountId: 'account',
      terminalId: 'terminal',
      callbackSecret: 'callback-secret',
    })
  })
})

describe('payment callback secret', () => {
  it('accepts only an exact non-empty value', () => {
    expect(verifyOpaqueSecret('same-secret', 'same-secret')).toBe(true)
    expect(verifyOpaqueSecret('wrong', 'same-secret')).toBe(false)
    expect(verifyOpaqueSecret('', '')).toBe(false)
  })
})
