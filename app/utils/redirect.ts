// Безопасный разбор ?redirect для auth-экранов (login/register).
// Пускаем только внутренний путь: не абсолютный URL (открытый редирект) и не «//host».
// Кабинеты исключены намеренно — иначе покупатель после входа проваливается в чужой
// кабинет вместо своего домашнего пути, который отдаёт signIn по роли профиля.
const CABINETS = ['/admin', '/studio', '/studio-designer', '/account', '/shop-admin']

export function safeRedirectPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (CABINETS.some(c => raw === c || raw.startsWith(c + '/') || raw.startsWith(c + '?'))) return null
  return raw
}
