import type { Database } from '~/types/database.types'

// Доступ к /shop-admin — только владельцу магазина (shops.owner_id = текущий юзер).
// Гость → на логин; вошедший без магазина → в личный кабинет. Роут дополнительно
// закрыт feature-flags middleware (b2bStorefront) на уровне FEATURE_ROUTES.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const supabase = useSupabaseClient<Database>()
  const { data } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.value.id)
    .limit(1)
    .maybeSingle()
  if (!data) {
    return navigateTo('/account')
  }
})
