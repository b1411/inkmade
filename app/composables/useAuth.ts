import type { Profile, UserRole } from '~/types/models'
import { FEATURES } from '~~/shared/config/features'

// Сессия + роль из profiles (§4, §8.1). Роль — источник доступа к кабинетам.
// Гостевой поток (§9.1): логин требуется только на checkout и для шаринга/сохранения.
export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const config = useRuntimeConfig()
  // профиль кэшируем в общем состоянии, чтобы не дёргать БД на каждый guard
  const profile = useState<Profile | null>('auth_profile', () => null)

  async function fetchProfile(force = false): Promise<Profile | null> {
    // Используем getUser() напрямую: user.value из useSupabaseUser() обновляется
    // асинхронно через onAuthStateChange и может быть null сразу после signIn.
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      profile.value = null
      return null
    }
    if (profile.value && profile.value.id === currentUser.id && !force) {
      return profile.value
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, created_at')
      .eq('id', currentUser.id)
      .single()
    if (error) {
      profile.value = null
      return null
    }
    profile.value = data as unknown as Profile
    return profile.value
  }

  const role = computed<UserRole | null>(() => profile.value?.role ?? null)
  const isAuthenticated = computed(() => !!user.value)
  const isStaff = computed(() => role.value === 'operator' || role.value === 'admin')
  const isAdmin = computed(() => role.value === 'admin')
  const isDesigner = computed(() => role.value === 'designer')

  // Домашний кабинет по роли (CRM §2). Единый источник для редиректа после входа
  // и для ссылки «Кабинет» в шапке — чтобы admin/operator/designer не попадали в /account.
  const homePath = computed<string>(() => {
    switch (role.value) {
      case 'admin': return '/admin'
      case 'operator': return '/studio'
      case 'designer': return FEATURES.designerMarketplace ? '/studio-designer' : '/account'
      default: return '/account'
    }
  })

  function roleToPath(r: UserRole | null | undefined): string {
    switch (r) {
      case 'admin': return '/admin'
      case 'operator': return '/studio'
      case 'designer': return FEATURES.designerMarketplace ? '/studio-designer' : '/account'
      default: return '/account'
    }
  }

  // Возвращает путь кабинета по роли — минуя реактивный computed,
  // чтобы навигация не зависела от тайминга обновления Vue-состояния.
  async function signIn(email: string, password: string): Promise<string> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const p = await fetchProfile(true)
    return roleToPath(p?.role)
  }

  async function signUp(
    email: string,
    password: string,
    fullName?: string,
    extra?: { phone?: string | null; marketingConsent?: boolean; redirectPath?: string | null },
  ) {
    // phone + marketing_consent кладём в user_metadata → триггер handle_new_user
    // переносит их в profiles (сбор лида).
    const base = String(config.public.siteUrl || (import.meta.client ? window.location.origin : '')).replace(/\/$/, '')
    const confirmedUrl = new URL('/auth/confirmed', base || 'http://localhost')
    if (extra?.redirectPath) confirmedUrl.searchParams.set('redirect', extra.redirectPath)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmedUrl.toString(),
        data: {
          full_name: fullName ?? null,
          phone: extra?.phone ?? null,
          marketing_consent: extra?.marketingConsent ?? false,
        },
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    profile.value = null
  }

  // Восстановление пароля (§9.1). Шлём письмо со ссылкой на /reset — там пользователь
  // задаёт новый пароль по recovery-сессии. redirectTo обязан быть абсолютным и входить
  // в Redirect URLs проекта Supabase. Из соображений анти-энумерации Supabase отвечает
  // успехом независимо от существования аккаунта — UI показывает нейтральный текст.
  async function requestPasswordReset(email: string): Promise<void> {
    const base = (config.public.siteUrl as string) || (import.meta.client ? window.location.origin : '')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/reset`,
    })
    if (error) throw error
  }

  // Смена пароля по активной сессии (recovery ИЛИ обычной). На /reset вызывается после
  // того, как ссылка из письма установила recovery-сессию (событие PASSWORD_RECOVERY).
  async function updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return {
    user,
    profile,
    role,
    isAuthenticated,
    isStaff,
    isAdmin,
    isDesigner,
    homePath,
    fetchProfile,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  }
}
