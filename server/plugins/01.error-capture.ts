// Централизованный перехват необработанных серверных ошибок (Nitro 'error' hook).
// Покрывает ВСЕ роуты, включая денежные (payment/webhook, orders/create): любое
// необработанное исключение или 5xx логируется структурно и (опц.) шлётся на
// ERROR_WEBHOOK_URL. Раньше такие падения были невидимы до ручного обнаружения.
import { logError } from '~~/server/utils/logger'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, context) => {
    // не шумим на штатных клиентских ошибках (4xx, кроме 429) — логируем серверные сбои
    const status = (error as { statusCode?: number })?.statusCode ?? 500
    if (status < 500 && status !== 429) return
    const path = context?.event?.path
    // best-effort, не блокируем обработку
    void logError('nitro', error, { path, statusCode: status })
  })
})
