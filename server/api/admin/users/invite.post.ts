import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { EMAIL_RE } from '~~/server/utils/validation'
import { logError } from '~~/server/utils/logger'

// Приглашение пользователя по email (§8.1). Только admin.
// Auth Admin API отправляет письмо-инвайт (нужен настроенный SMTP в Supabase).
// Триггер handle_new_user создаст профиль с ролью customer — если задана иная роль,
// проставляем её сразу после создания.
const ROLES = ['customer', 'operator', 'admin'] as const
type InviteRole = (typeof ROLES)[number]

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ email?: string; role?: string }>(event)
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) throw createError({ statusCode: 400, statusMessage: 'Некорректный email' })
  const role: InviteRole = ROLES.includes(body.role as InviteRole) ? (body.role as InviteRole) : 'customer'

  const svc = serverSupabaseServiceRole<Database>(event)

  const { data: me } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Только админ' })

  const { data, error } = await svc.auth.admin.inviteUserByEmail(email)
  if (error) {
    // ошибка Auth Admin (например, email уже существует) — не утекаем её текст клиенту
    await logError('admin/users/invite', error, { email, role })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось отправить приглашение' })
  }

  if (role !== 'customer' && data.user) {
    await svc.from('profiles').update({ role }).eq('id', data.user.id)
  }

  return { ok: true, email, role }
})
