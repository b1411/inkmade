// Лёгкая серверная валидация входных данных без внешних зависимостей (zod в проекте нет).
// Назначение — отсечь невалидные/враждебные значения на границе API: NaN/Infinity,
// отрицательные суммы, мусор в JSON-полях, некорректные UUID. Авторитетные бизнес-инварианты
// (цена по БД, подпись webhook, RLS) остаются в самих хендлерах — это первый рубеж.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

// Требует валидный UUID из router-параметра, иначе 400. Защищает RPC/запросы от мусора в [id].
export function requireUuid(v: unknown, label = 'идентификатор'): string {
  if (!isUuid(v)) {
    throw createError({ statusCode: 400, statusMessage: `Некорректный ${label}` })
  }
  return v
}

// Положительное конечное число в заданных границах. Отсекает NaN, Infinity, строки, объекты.
export function isFinitePositive(v: unknown, max = Number.MAX_SAFE_INTEGER): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max
}

// Конечное неотрицательное число (для сумм, где 0 допустим).
export function isFiniteNonNeg(v: unknown, max = Number.MAX_SAFE_INTEGER): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Минимальная структурная валидация адреса доставки (хранится как jsonb).
// Требуем объект с валидным email и непустым именем/телефоном — этого достаточно,
// чтобы уведомления и обработка заказа не падали на мусоре, и не превращаем в строгую схему.
export interface ShippingAddr {
  name?: string
  phone?: string
  email?: string
  city?: string
  address?: string
  [k: string]: unknown
}

export function validateShippingAddr(v: unknown): ShippingAddr {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный адрес доставки' })
  }
  const a = v as Record<string, unknown>
  const email = typeof a.email === 'string' ? a.email.trim() : ''
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Укажите корректный email для заказа' })
  }
  const phone = typeof a.phone === 'string' ? a.phone.replace(/\D/g, '') : ''
  if (phone.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Укажите корректный телефон' })
  }
  return a as ShippingAddr
}

// Геометрия плейсмента дизайна в мм. Предотвращает NaN/Infinity/отрицательные размеры,
// которые исказили бы цену или сделали печать невозможной. Верхняя граница — здравый предел.
const MM_MAX = 2000

export function assertPlacementGeometry(p: {
  width_mm?: number; height_mm?: number; natural_w?: number; natural_h?: number
}): void {
  for (const [k, v] of Object.entries(p)) {
    if (v == null) continue
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MM_MAX * 100) {
      throw createError({ statusCode: 400, statusMessage: `Некорректная геометрия принта (${k})` })
    }
  }
}
