export interface ReadinessCheck {
  key: string
  ok: boolean
  critical: boolean
  message: string
}

type EnvLike = Record<string, string | undefined>

export function productionReadiness(env: EnvLike): ReadinessCheck[] {
  const siteUrl = env.NUXT_PUBLIC_SITE_URL || ''
  const isHttps = /^https:\/\//i.test(siteUrl)
  return [
    { key: 'supabase_url', ok: Boolean(env.NUXT_PUBLIC_SUPABASE_URL), critical: true, message: 'Supabase URL configured' },
    { key: 'supabase_anon', ok: Boolean(env.NUXT_PUBLIC_SUPABASE_ANON_KEY), critical: true, message: 'Supabase anon key configured' },
    { key: 'supabase_service', ok: Boolean(env.SUPABASE_SERVICE_ROLE_KEY), critical: true, message: 'Supabase service key configured' },
    { key: 'site_https', ok: isHttps, critical: true, message: 'Canonical site URL uses HTTPS' },
    { key: 'epay_provider', ok: env.PAYMENT_PROVIDER === 'epay', critical: true, message: 'Halyk ePay selected' },
    { key: 'epay_credentials', ok: ['EPAY_CLIENT_ID', 'EPAY_CLIENT_SECRET', 'EPAY_SHOP_ID', 'EPAY_ACCOUNT_ID'].every(key => Boolean(env[key])), critical: true, message: 'Halyk ePay credentials configured' },
    { key: 'payment_callback', ok: (env.PAYMENT_WEBHOOK_SECRET?.length || 0) >= 32, critical: true, message: 'Payment callback secret is strong' },
    { key: 'fiscalization', ok: Boolean(env.FISCAL_PROVIDER && env.FISCAL_API_KEY), critical: true, message: 'Online KKM/OFD configured' },
    { key: 'email', ok: Boolean(env.RESEND_API_KEY && env.RESEND_FROM), critical: true, message: 'Transactional email configured' },
    { key: 'legal_review', ok: env.LEGAL_REVIEW_APPROVED === 'true', critical: true, message: 'Legal review approved' },
    { key: 'real_content', ok: env.REAL_CONTENT_APPROVED === 'true', critical: true, message: 'Real products, print photos and reviews approved' },
    { key: 'analytics', ok: Boolean(env.NUXT_PUBLIC_ANALYTICS_ID), critical: false, message: 'Product analytics configured' },
    { key: 'error_monitoring', ok: Boolean(env.ERROR_WEBHOOK_URL), critical: false, message: 'Error monitoring configured' },
  ]
}

export function assertProductionCommerceReady(env: EnvLike = process.env) {
  if (env.NODE_ENV !== 'production') return
  const failed = productionReadiness(env).filter(check => check.critical && !check.ok)
  if (failed.length) {
    throw createError({
      statusCode: 503,
      statusMessage: `Production checkout is blocked: ${failed.map(check => check.key).join(', ')}`,
    })
  }
}
