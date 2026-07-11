// Маппинг ошибок Supabase Auth (GoTrue) → i18n-ключ, чтобы в RU/KK интерфейсе не
// всплывали сырые англоязычные строки («Invalid login credentials», «User already
// registered» и т.п.). useAuth пробрасывает исходный AuthError — у него есть стабильный
// `code` (предпочитаем его), плюс подстраховка по подстроке message и HTTP-статусу.
// Возвращаем КЛЮЧ; компонент делает t(authErrorKey(e)). Неизвестное → generic.

export function authErrorKey(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number; statusCode?: number } | null
  const code = String(err?.code ?? '').toLowerCase()
  const msg = String(err?.message ?? '').toLowerCase()
  const status = err?.status ?? err?.statusCode
  const has = (s: string) => code.includes(s) || msg.includes(s)

  if (code === 'invalid_credentials' || has('invalid login') || has('invalid_credentials')) return 'auth.errors.invalidCredentials'
  if (code === 'email_not_confirmed' || has('not confirmed')) return 'auth.errors.emailNotConfirmed'
  if (code === 'user_already_exists' || code === 'email_exists' || has('already registered') || has('already exists')) return 'auth.errors.emailExists'
  if (code === 'weak_password' || has('password should be at least') || has('weak_password')) return 'auth.errors.weakPassword'
  if (code === 'same_password' || has('should be different')) return 'auth.errors.samePassword'
  if (code.includes('rate') || has('rate limit') || has('too many') || status === 429) return 'auth.errors.rateLimited'
  if (code === 'otp_expired' || code === 'session_expired' || has('expired') || has('invalid or has expired')) return 'auth.errors.linkExpired'
  if (code === 'validation_failed' || has('unable to validate email') || has('invalid email') || has('invalid format')) return 'auth.errors.invalidEmail'
  if (code === 'signup_disabled' || has('signups not allowed') || has('signup is disabled')) return 'auth.errors.signupDisabled'
  if (code === 'user_not_found' || has('user not found')) return 'auth.errors.userNotFound'
  return 'auth.errors.generic'
}
