import { logError } from '~~/server/utils/logger'

// Приём клиентских (браузерных) ошибок для серверной видимости (аудит 2026-07-12 #4).
// Публичный (исключение может случиться до входа), но rate-limited (middleware,
// префикс /api/telemetry/) и с жёстким кэпом размера полей. Содержимому не доверяем —
// только логируем усечённо через тот же logError, что и серверные сбои (→ ERROR_WEBHOOK_URL).
export default defineEventHandler(async (event) => {
  const body = await readBody<{ message?: string; stack?: string; url?: string; kind?: string }>(event).catch(() => null)
  const cut = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : undefined)
  const message = cut(body?.message, 500) || 'unknown client error'
  await logError('client', message, {
    kind: cut(body?.kind, 40),
    url: cut(body?.url, 300),
    stack: cut(body?.stack, 2000),
    ua: cut(getHeader(event, 'user-agent'), 200),
  })
  return { ok: true }
})
