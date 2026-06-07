// Доступ к /studio-designer — только designer (CRM §2). Ошибка роли = редирект.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const { fetchProfile, isDesigner, isAdmin } = useAuth()
  await fetchProfile(true) // принудительно из БД: роль могла измениться
  // admin тоже допускается (просмотр), остальным — на главную
  if (!isDesigner.value && !isAdmin.value) {
    return navigateTo('/')
  }
})
