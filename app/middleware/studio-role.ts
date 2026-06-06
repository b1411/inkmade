// Доступ к /studio — только operator/admin (§8.1). Ошибка роли = редирект.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const { fetchProfile, isStaff } = useAuth()
  await fetchProfile()
  if (!isStaff.value) {
    return navigateTo('/')
  }
})
