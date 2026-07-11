import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireUuid } from '~~/server/utils/validation'
import { logError } from '~~/server/utils/logger'

// Модерация дизайна сотрудником (P2.14, §24). Только operator/admin.
// Service role обходит RLS; триггер guard_design_moderation пропускает service role
// (auth.uid() is null), поэтому проверка роли — здесь, на серверной границе.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const id = requireUuid(getRouterParam(event, 'id'), 'идентификатор дизайна')

  const body = await readBody<{ status: 'approved' | 'rejected' }>(event)
  if (body.status !== 'approved' && body.status !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'Недопустимый статус модерации' })
  }

  const svc = serverSupabaseServiceRole<Database>(event)

  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Только производство/админ' })
  }

  const { error } = await svc.from('designs').update({ moderation_status: body.status }).eq('id', id)
  if (error) {
    await logError('design-moderation', error.message, { designId: id, status: body.status })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось обновить статус дизайна' })
  }

  return { ok: true, status: body.status }
})
