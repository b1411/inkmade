// Глобальная подгрузка профиля (роль) при наличии сессии. Без этого на публичных
// страницах profile=null и useAuth.homePath отдаёт дефолтный /account для всех —
// админ по иконке «Кабинет» попадал в клиентский кабинет. Теперь роль известна
// везде, и шапка/редиректы ведут в правильный кабинет по роли.
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { fetchProfile, profile } = useAuth()

  watch(
    user,
    (u) => {
      if (u && profile.value?.id !== u.id) fetchProfile(true)
      else if (!u) profile.value = null
    },
    { immediate: true },
  )
})
