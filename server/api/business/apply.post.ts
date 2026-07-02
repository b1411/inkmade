import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { EMAIL_RE } from '~~/server/utils/validation'
import { normalizeKzPhone } from '~~/shared/config/phone'
import { logError } from '~~/server/utils/logger'

// Приём заявки на открытие B2B-магазина мерча (Фаза B1). Публичная форма с /business.
// Вставка идёт на service-role (RLS запрещает прямую вставку из браузера) — здесь же
// первый рубеж валидации и обрезка полей от мусора/спама.
const cap = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  const orgName = cap(body.orgName, 160)
  const contactName = cap(body.contactName, 120)
  const email = cap(body.email, 160).toLowerCase()
  const phoneRaw = cap(body.phone, 40)
  const desiredSlug = cap(body.desiredSlug, 63).toLowerCase().replace(/[^a-z0-9-]/g, '') || null
  const audience = cap(body.audience, 200) || null
  const comment = cap(body.comment, 2000) || null

  if (!orgName) throw createError({ statusCode: 400, statusMessage: 'Укажите название организации' })
  if (!contactName) throw createError({ statusCode: 400, statusMessage: 'Укажите контактное лицо' })
  if (!EMAIL_RE.test(email)) throw createError({ statusCode: 400, statusMessage: 'Укажите корректный email' })
  const phone = normalizeKzPhone(phoneRaw)
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Укажите корректный телефон' })

  // Вставка на service-role (RLS запрещает прямую вставку из браузера). Владельца
  // магазина определяем на этапе одобрения заявки (фаза B2) — здесь только лид.
  const svc = serverSupabaseServiceRole<Database>(event)

  const { error } = await svc.from('shop_applications').insert({
    org_name: orgName,
    contact_name: contactName,
    email,
    phone,
    desired_slug: desiredSlug,
    audience,
    comment,
  })
  if (error) {
    await logError('business/apply', error, { orgName, email })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось отправить заявку' })
  }

  return { ok: true }
})
