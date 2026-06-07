import type { Profile, UserRole } from '~/types/models'

// Сессия + роль из profiles (§4, §8.1). Роль — источник доступа к кабинетам.
// Гостевой поток (§9.1): логин требуется только на checkout и для шаринга/сохранения.
export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  // профиль кэшируем в общем состоянии, чтобы не дёргать БД на каждый guard
  const profile = useState<Profile | null>('auth_profile', () => null)

  async function fetchProfile(force = false): Promise<Profile | null> {
    if (!user.value) {
      profile.value = null
      return null
    }
    if (profile.value && profile.value.id === user.value.id && !force) {
      return profile.value
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, created_at')
      .eq('id', user.value.id)
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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await fetchProfile(true)
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? null } },
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
