import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { computePromoDiscount } from '~~/server/utils/promo'
import { resolveShopPromo } from '~~/server/utils/shop-promo'
import { promoValidateSchema, parseOrThrow } from '~~/server/utils/schemas'

// Предпросмотр скидки по промокоду на checkout (CRM §6.7). Возвращает скидку для суммы.
// Поддерживает платформенный код (public.promo_codes) И код магазина (shop_promo_codes,
// по позициям корзины). Авторитетный расчёт повторяется при создании заказа.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = parseOrThrow(promoValidateSchema, await readBody(event))
  const subtotal = body.subtotal

  const svc = serverSupabaseServiceRole<Database>(event)
  // платформенный код — приоритет; затем код магазина по позициям корзины
  const platform = await computePromoDiscount(svc, body.code, subtotal)
  if (platform) return { valid: true, ...platform }

  if (body.items?.length) {
    const shop = await resolveShopPromo(svc, body.code, body.items)
    if (shop) return { valid: true, code: shop.code, discount: shop.discount, scope: 'shop' as const }
  }
  return { valid: false }
})
