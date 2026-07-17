import { describe, expect, it } from 'vitest'
import { productionReadiness } from '../server/utils/readiness'

describe('production readiness gate', () => {
  it('blocks checkout when fiscalization or legal approval is missing', () => {
    const checks = productionReadiness({
      NUXT_PUBLIC_SITE_URL: 'https://inkmade.kz',
      PAYMENT_PROVIDER: 'epay',
      EPAY_CLIENT_ID: 'a', EPAY_CLIENT_SECRET: 'b', EPAY_SHOP_ID: 'c', EPAY_ACCOUNT_ID: 'd',
      PAYMENT_WEBHOOK_SECRET: 'x'.repeat(32),
    })
    expect(checks.find(check => check.key === 'fiscalization')?.ok).toBe(false)
    expect(checks.find(check => check.key === 'legal_review')?.ok).toBe(false)
  })

  it('keeps analytics and monitoring non-critical', () => {
    const checks = productionReadiness({})
    expect(checks.find(check => check.key === 'analytics')?.critical).toBe(false)
    expect(checks.find(check => check.key === 'error_monitoring')?.critical).toBe(false)
  })
})
