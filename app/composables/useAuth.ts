import type { Profile, UserRole } from '~/types/models'

// Сессия + роль из profiles (§4, §8.1). Роль — источник доступа к кабинетам.
// Гостевой поток (§9.1): логин требуется только на checkout и для шаринга/сохранения.
export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
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
      case 'designer': return '/studio-designer'
      default: return '/account'
    }
  })

  function roleToPath(r: UserRole | null | undefined): string {
    switch (r) {
      case 'admin': return '/admin'
      case 'operator': return '/studio'
      case 'designer': return '/studio-designer'
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
    extra?: { phone?: string | null; marketingConsent?: boolean },
  ) {
    // phone + marketing_consent кладём в user_metadata → триггер handle_new_user
    // переносит их в profiles (сбор лида).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
  }
}
