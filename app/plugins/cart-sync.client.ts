// Кросс-девайс синхронизация корзины (§9.1). Единственный владелец user-watch для
// корзины: при входе сливает локальную (гостевую) корзину в серверную и тянет её,
// при выходе очищает. Смену токена (тот же uid) игнорирует — лишних пушей нет.
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const cart = useCart()
  let lastUid: string | null = null

  watch(user, async (u) => {
    const uid = u?.id ?? null
    if (uid && uid !== lastUid) {
      await cart.syncOnLogin()
    } else if (!uid && lastUid) {
      cart.clearOnLogout()
    }
    lastUid = uid
  }, { immediate: true })
})
