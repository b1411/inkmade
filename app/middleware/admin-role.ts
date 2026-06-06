// Доступ к /admin — только admin (§8.1). Ошибка роли = редирект.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const { fetchProfile, isAdmin } = useAuth()
  await fetchProfile()
  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
