import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { randomBytes } from 'node:crypto'
import type { Database } from '~/types/database.types'
import { requireUuid } from '~~/server/utils/validation'

// Генерация публичной ссылки на дизайн (P4.22, §11 — шаринг ради охвата).
// Токен создаётся на сервере (crypto), только владельцем дизайна. Идемпотентно:
// повторный вызов возвращает существующий токен.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const id = requireUuid(getRouterParam(event, 'id'), 'идентификатор дизайна')

  const svc = serverSupabaseServiceRole<Database>(event)
  const { data: design } = await svc
    .from('designs')
    .select('id, user_id, share_token')
    .eq('id', id)
    .single()

  if (!design || design.user_id !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Дизайн не найден' })
  }

  let token = design.share_token
  if (!token) {
    token = randomBytes(9).toString('base64url')
    const { error } = await svc
      .from('designs')
      .update({ share_token: token, is_saved: true })
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Не удалось создать ссылку' })
  }

  return { token }
})
