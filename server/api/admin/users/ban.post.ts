import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireUuid } from '~~/server/utils/validation'
import { logError } from '~~/server/utils/logger'

// Блокировка/разблокировка пользователя (§8.1). Только admin.
// Бан через Auth Admin API: ban_duration отзывает сессии и запрещает вход.
// Защита: нельзя забанить себя или другого администратора.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ userId?: string; ban?: boolean }>(event)
  const targetId = requireUuid(body.userId, 'идентификатор пользователя')
  const ban = !!body.ban

  const svc = serverSupabaseServiceRole<Database>(event)

  const { data: me } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Только админ' })

  if (targetId === user.id) throw createError({ statusCode: 400, statusMessage: 'Нельзя заблокировать себя' })

  const { data: target } = await svc.from('profiles').select('role').eq('id', targetId).single()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })
  if (target.role === 'admin') throw createError({ statusCode: 400, statusMessage: 'Нельзя заблокировать администратора' })

  // 876000h ≈ 100 лет = бессрочный бан; 'none' — снять блокировку
  const { error } = await svc.auth.admin.updateUserById(targetId, {
    ban_duration: ban ? '876000h' : 'none',
  })
  if (error) {
    // не утекаем внутреннюю ошибку Auth Admin клиенту — логируем, отдаём обобщённое
    await logError('admin/users/ban', error, { targetId, ban })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось изменить блокировку пользователя' })
  }

  return { ok: true, banned: ban }
})
