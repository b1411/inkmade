// Rate-limiting чувствительных эндпоинтов (P2.13): оплата и создание заказа.
// Best-effort in-memory sliding window по IP — на serverless инстансы эфемерны и
// могут размножаться, поэтому это базовая защита от спама/перебора, а не строгий лимит.
// Жёсткие инварианты (подпись webhook, идемпотентность, серверная цена) живут в самих хендлерах.

interface Hit {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
// Порядок важен: более специфичные префиксы — ВЫШЕ общих (pickLimit берёт первый матч).
const LIMITS: { prefix: string; max: number }[] = [
  { prefix: '/api/ai/', max: 10 }, // AI-генерация дорогая — жёсткий лимит поверх месячной квоты
  { prefix: '/api/payment/webhook', max: 60 }, // приходит от провайдера, лимит мягче
  { prefix: '/api/payment/', max: 20 },
  { prefix: '/api/orders/create', max: 20 },
  { prefix: '/api/orders/', max: 40 }, // смена статуса и пр.
  { prefix: '/api/designs/shared/', max: 30 }, // публичный доступ по токену — отдельный жёсткий лимит от перебора
  { prefix: '/api/designs/', max: 40 }, // импорт/модерация/share
  { prefix: '/api/promo/', max: 30 }, // валидация промокода — от перебора кодов
  { prefix: '/api/business/', max: 10 }, // публичная форма заявки на B2B-магазин — от спама
  { prefix: '/api/telemetry/', max: 30 }, // клиентские ошибки — публичный приём, кэп от спама
]

const buckets = new Map<string, Hit>()

function pickLimit(path: string): { prefix: string; max: number } | null {
  for (const l of LIMITS) {
    if (path.startsWith(l.prefix)) return l
  }
  return null
}

export default defineEventHandler((event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return

  const limit = pickLimit(path)
  if (!limit) return

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${limit.prefix}:${ip}`
  const now = Date.now()

  // ленивая очистка просроченных корзин, чтобы Map не рос бесконечно
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }

  const hit = buckets.get(key)
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  hit.count += 1
  if (hit.count > limit.max) {
    const retryAfter = Math.ceil((hit.resetAt - now) / 1000)
    // H3 типизирует Retry-After как number и сам сериализует его в строку при отдаче.
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Слишком много запросов, попробуйте позже' })
  }
})
