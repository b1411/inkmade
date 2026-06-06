// Требует логина (§4, §8.1). Применять через definePageMeta({ middleware: 'auth' }).
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
