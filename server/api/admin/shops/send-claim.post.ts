import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { sendShopClaimEmail } from '~~/server/utils/email'
import { logError } from '~~/server/utils/logger'

// Отправка письма-активации владельцу магазина (Tier2 E). Только admin. Данные claim
// (token/email) берём из БД по shopId на service-role — клиенту не доверяем. No-op без
// RESEND-ключа (вернём sent:false — админ отправит ссылку вручную, она показана в UI).
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ shopId?: string }>(event)
  const shopId = String(body.shopId ?? '').trim()
  if (!shopId) throw createError({ statusCode: 400, statusMessage: 'shopId обязателен' })

  const svc = serverSupabaseServiceRole<Database>(event)

  const { data: me } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Только админ' })

  const { data: shop } = await svc
    .from('shops')
    .select('name, claim_token, claim_email, owner_id')
    .eq('id', shopId)
    .maybeSingle()
  if (!shop) throw createError({ statusCode: 404, statusMessage: 'Магазин не найден' })
  if (shop.owner_id) return { sent: false, reason: 'has_owner' }
  if (!shop.claim_token || !shop.claim_email) return { sent: false, reason: 'no_claim' }

  const site = (useRuntimeConfig(event).public.siteUrl as string) || process.env.NUXT_PUBLIC_SITE_URL || 'https://inkmade-pi.vercel.app'
  const link = `${site}/shop-claim/${shop.claim_token}`

  try {
    const sent = await sendShopClaimEmail(shop.claim_email, { shopName: shop.name, link })
    return { sent, email: shop.claim_email }
  } catch (e) {
    await logError('admin/shops/send-claim', e, { shopId })
    return { sent: false, reason: 'error' }
  }
})
