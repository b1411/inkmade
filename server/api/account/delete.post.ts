import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { logError } from '~~/server/utils/logger'

// Удаление аккаунта клиентом (GDPR «право на забвение», Фаза C4).
// НЕ хард-удаление auth-пользователя: orders.user_id ON DELETE CASCADE снёс бы историю
// заказов и финзаписи (юр. хранение продаж обязательно). Поэтому:
//   1) удаляем персональные данные (адреса/избранное/корзина/сохранённые дизайны),
//   2) обезличиваем профиль (PII → null),
//   3) обезличиваем email + бессрочный бан входа через Auth Admin API.
// Заказы остаются, но уже без привязки к личным данным.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const uid = user.id

  // самоудаление доступно только клиентам; staff/admin — через админку (защита от
  // случайного сноса служебного аккаунта)
  const { data: me } = await svc.from('profiles').select('role').eq('id', uid).single()
  if (!me) throw createError({ statusCode: 404, statusMessage: 'Профиль не найден' })
  if (me.role !== 'customer') throw createError({ statusCode: 403, statusMessage: 'Удаление доступно только клиентам' })

  // 1) атомарная анонимизация: удаление персональных данных + обезличивание профиля
  //    (адреса/избранное/корзина/сохранённые дизайны + full_name/phone/marketing/avatar_url).
  //    Одна транзакция в RPC — без риска полу-удалённого состояния (аудит).
  const { error: anonErr } = await svc.rpc('anonymize_account', { p_uid: uid })
  if (anonErr) {
    await logError('account/delete', anonErr, { uid, step: 'anonymize' })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось удалить аккаунт' })
  }

  // 2) удалить файл(ы) аватара из публичного бакета (best-effort: путь avatars/<uid>/…)
  try {
    const { data: files } = await svc.storage.from('design-uploads').list(`avatars/${uid}`)
    if (files?.length) {
      await svc.storage.from('design-uploads').remove(files.map(f => `avatars/${uid}/${f.name}`))
    }
  } catch { /* не критично: строка профиля уже обезличена */ }

  // 3) обезличить email + бессрочный бан (876000h ≈ 100 лет)
  const { error } = await svc.auth.admin.updateUserById(uid, {
    email: `deleted+${uid}@deleted.invalid`,
    email_confirm: true,
    ban_duration: '876000h',
    user_metadata: {},
  })
  if (error) {
    await logError('account/delete', error, { uid })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось удалить аккаунт' })
  }

  return { ok: true }
})
