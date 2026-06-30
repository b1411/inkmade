import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '~/types/database.types'

// Сохранение сгенерированного изображения в НАШ Storage (§17.3). Кладём в тот же
// публичный бакет, что и загрузки (design-uploads) — итоговый publicUrl проходит
// SSRF-гард assertOwnStorageUrl при создании заказа. Грузим сервис-ролью (обходит RLS).

// Whitelist разрешённых растровых форматов. Расширение и content-type берём ОТСЮДА,
// а не из ответа провайдера напрямую — иначе image/svg+xml дал бы .svg (XSS-вектор,
// если бакет когда-нибудь разрешит SVG). Нормализуем content-type (без '; charset').
const ALLOWED_IMAGE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function uploadAiImage(
  event: H3Event,
  buffer: Buffer,
  contentType: string,
  userId: string,
): Promise<string> {
  const ct = (contentType || '').split(';')[0]!.trim().toLowerCase()
  const ext = ALLOWED_IMAGE[ct]
  if (!ext) throw createError({ statusCode: 502, statusMessage: 'Неподдерживаемый формат изображения от провайдера' })
  const svc = serverSupabaseServiceRole<Database>(event)
  const path = `ai-generated/${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
  const { error } = await svc.storage.from('design-uploads').upload(path, buffer, { contentType: ct, upsert: false })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить изображение' })
  return svc.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
}
