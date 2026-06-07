// Доступ к /admin — только admin (§8.1). Ошибка роли = редирект.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const { fetchProfile, isAdmin } = useAuth()
  await fetchProfile(true) // принудительно из БД: роль могла измениться (аудит H16)
  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
