import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '~/types/database.types'

// Сохранение сгенерированного изображения в НАШ Storage (§17.3). Кладём в тот же
// публичный бакет, что и загрузки (design-uploads) — итоговый publicUrl проходит
// SSRF-гард assertOwnStorageUrl при создании заказа. Грузим сервис-ролью (обходит RLS).
export async function uploadAiImage(
  event: H3Event,
  buffer: Buffer,
  contentType: string,
  userId: string,
): Promise<string> {
  const svc = serverSupabaseServiceRole<Database>(event)
  const ext = contentType.includes('jpeg') ? 'jpg' : (contentType.split('/')[1] || 'png')
  const path = `ai-generated/${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
  const { error } = await svc.storage.from('design-uploads').upload(path, buffer, { contentType, upsert: false })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить изображение' })
  return svc.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
}
