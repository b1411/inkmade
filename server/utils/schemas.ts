import { z } from 'zod'

// Централизованные Zod-схемы для тел запросов (readBody). Первый рубеж на границе API:
// отсекают мусор/враждебный ввод декларативно, до бизнес-логики. Авторитетные инварианты
// (цена по БД, подпись webhook, RLS) остаются в хендлерах — схема не заменяет их.

const MM_MAX = 2000
const GEOM_MAX = MM_MAX * 100 // верхний предел геометрии в мм (как в legacy validation)

/** Конечное число в [0, max]. Отсекает NaN/Infinity/строки. */
const finiteNonNeg = (max = GEOM_MAX) =>
  z.number().finite().min(0).max(max)

// ── Дизайн (spec) ───────────────────────────────────────────────
const placementSchema = z.object({
  zone: z.string().max(64).optional(),
  width_mm: finiteNonNeg().optional(),
  height_mm: finiteNonNeg().optional(),
  natural_w: finiteNonNeg().optional(),
  natural_h: finiteNonNeg().optional(),
  vector: z.boolean().optional(),
  source: z.string().max(32).optional(),
  text: z.string().max(2000).optional(),
  asset_url: z.string().max(2048).optional(),
}).passthrough()

const printFileSchema = z.object({
  zone: z.string().max(64),
  url: z.string().max(2048),
  w: z.number().finite().nonnegative(),
  h: z.number().finite().nonnegative(),
  dpi: z.number().finite().positive(),
})

const designSpecSchema = z.object({
  placements: z.array(placementSchema).max(20).optional(),
  print_mode: z.string().max(32).optional(),
  composition_url: z.string().max(2048).optional(),
  color_count: z.number().int().min(0).max(12).optional(),
  print_files: z.array(printFileSchema).max(8).optional(),
  print_id: z.uuid().nullish(),
}).passthrough()

// ── Адрес доставки (jsonb) ──────────────────────────────────────
export const shippingAddrSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.email({ message: 'Укажите корректный email для заказа' }),
  // телефон: после удаления нецифр должно остаться >= 10 знаков
  phone: z.string().refine(
    v => v.replace(/\D/g, '').length >= 10,
    { message: 'Укажите корректный телефон' },
  ),
  city: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
}).passthrough()

// ── POST /api/orders/create ─────────────────────────────────────
const orderItemSchema = z.object({
  productId: z.uuid({ message: 'Некорректный товар' }),
  variantId: z.uuid({ message: 'Некорректный вариант' }),
  printMethod: z.string().max(32).nullable(),
  spec: designSpecSchema,
  quantity: z.number().int().min(1).max(1000),
})

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1, { message: 'Корзина пуста' }).max(100),
  shippingAddr: shippingAddrSchema,
  promoCode: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
  gift: z.object({
    recipient: z.string().max(200).optional(),
    message: z.string().max(1000).optional(),
    hidePrice: z.boolean().optional(),
  }).optional(),
})

// ── POST /api/designs/import ────────────────────────────────────
export const designImportSchema = z.object({
  designs: z.array(z.object({
    productId: z.uuid().optional(),
    spec: z.unknown().optional(),
    previewUrl: z.string().max(2048).nullish(),
    parentId: z.uuid().nullish(),
  })).max(20).optional(),
})

// ── POST /api/promo/validate ────────────────────────────────────
export const promoValidateSchema = z.object({
  code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
  subtotal: z.number().finite().positive({ message: 'Некорректная сумма' }),
})

// ── POST /api/ai/generate ───────────────────────────────────────
// Пресеты стилей синхронны с STYLE_KEYWORDS в server/utils/ai-image.ts
export const aiStyles = ['minimal', 'vintage', 'lettering', 'street', 'anime', 'ornament'] as const
export const aiPrintGenerateSchema = z.object({
  prompt: z.string().trim()
    .min(3, { message: 'Опишите идею принта (минимум 3 символа)' })
    .max(500, { message: 'Слишком длинное описание (до 500 символов)' }),
  style: z.enum(aiStyles).optional(),
  aspect: z.enum(['square', 'portrait', 'landscape']).optional(),
})

// ── POST /api/orders/[id]/status ────────────────────────────────
// `to` остаётся строкой — валидность перехода проверяет автомат (isValidTransition).
// Здесь — только границы (длины), чтобы note/tracking не раздували лог статусов.
export const orderStatusSchema = z.object({
  to: z.string().trim().min(1).max(32),
  note: z.string().max(1000).optional(),
  trackingNo: z.string().max(128).optional(),
  carrier: z.string().max(128).optional(),
})

// ── Webhook payload (после JSON.parse сырого тела) ──────────────
// amount опционален: mock-провайдер его кладёт, реальный шлюз обязан — apply_paid
// сверяет его с orders.total (anti-fraud «оплати 1 ₸»).
export const webhookPayloadSchema = z.object({
  orderId: z.uuid({ message: 'orderId обязателен' }),
  providerTxn: z.string().max(256).optional(),
  amount: z.number().finite().nonnegative().optional(),
}).passthrough()

/**
 * Распарсить и провалидировать тело по схеме. ZodError → 400 с первым понятным
 * сообщением (issue.message), не утекая структуру схемы клиенту.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data)
  if (!r.success) {
    const first = r.error.issues[0]
    const msg = first?.message && !/^Invalid/.test(first.message)
      ? first.message
      : 'Некорректные данные запроса'
    throw createError({ statusCode: 400, statusMessage: msg })
  }
  return r.data
}
