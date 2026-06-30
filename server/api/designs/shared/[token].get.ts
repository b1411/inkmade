import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Публичное чтение расшаренного дизайна по токену (P4.22).
// Через service role, но возвращаем ТОЛЬКО безопасную проекцию: превью + товар.
// Никаких user_id, оригиналов файлов и print_file_url — приватность владельца (§10 RLS).
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Нет токена' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data } = await svc
    .from('designs')
    .select('id, preview_url, spec, moderation_status, products(title, slug, alias)')
    .eq('share_token', token)
    .maybeSingle()

  // отклонённый модерацией дизайн (копирайт/запрещёнка) публично не отдаём по ссылке
  if (!data || data.moderation_status === 'rejected') {
    throw createError({ statusCode: 404, statusMessage: 'Дизайн не найден' })
  }

  const spec = data.spec as { composition_url?: string } | null
  const product = data.products as { title: string; slug: string; alias: string } | null

  return {
    preview: data.preview_url ?? spec?.composition_url ?? null,
    product: product ? { title: product.title, slug: product.slug, alias: product.alias } : null,
  }
})
