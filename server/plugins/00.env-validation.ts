// Валидация окружения на старте сервера (Nitro). Раньше отсутствие, например,
// PAYMENT_WEBHOOK_SECRET всплывало только при первом webhook (500 в проде).
// Теперь критичные переменные проверяются при запуске: в проде — fail-fast,
// в dev — предупреждение (чтобы локально можно было поднимать без всех ключей).
//
// Источник перечня переменных — .env.example. Опциональные (фичи-флаги) не валятся,
// а только логируются как отключённые.

// Критичные: без них приложение не функционирует корректно.
const REQUIRED = [
  'NUXT_PUBLIC_SUPABASE_URL',
  'NUXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYMENT_WEBHOOK_SECRET',
  'NUXT_PUBLIC_SITE_URL',
] as const

// Опциональные: фича работает в no-op без них (аналитика, письма, WhatsApp, реальные платежи).
const OPTIONAL = [
  'PAYMENT_MERCHANT_ID',
  'PAYMENT_SECRET_KEY',
  'NUXT_PUBLIC_META_PIXEL_ID',
  'NUXT_PUBLIC_TIKTOK_PIXEL_ID',
  'NUXT_PUBLIC_ANALYTICS_ID',
  'RESEND_API_KEY',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_ID',
  'ERROR_WEBHOOK_URL',
] as const

export default defineNitroPlugin(() => {
  const isProd = process.env.NODE_ENV === 'production'

  const missingRequired: string[] = REQUIRED.filter((k) => !process.env[k]?.trim())
  const missingOptional = OPTIONAL.filter((k) => !process.env[k]?.trim())

  if (missingOptional.length) {
    console.warn(
      `[env] отключённые фичи (нет переменных): ${missingOptional.join(', ')}`,
    )
  }

  // Дополнительная защита: дефолтный секрет webhook недопустим (см. .env.example).
  if (process.env.PAYMENT_WEBHOOK_SECRET === 'dev-mock-secret' && isProd) {
    missingRequired.push('PAYMENT_WEBHOOK_SECRET (дефолтный dev-mock-secret недопустим в проде)')
  }

  if (missingRequired.length) {
    const msg = `[env] отсутствуют обязательные переменные: ${missingRequired.join(', ')}`
    if (isProd) {
      // fail-fast: лучше упасть на старте, чем отдавать сломанные ответы в проде
      throw new Error(msg)
    }
    console.warn(`${msg} (dev: продолжаем, но часть функций не работает)`)
  }
})
