// Перенос гостевых сохранённых дизайнов в аккаунт при входе (CRM §3.2).
// Следит за состоянием пользователя; как только он входит — отправляет локальные
// дизайны на сервер и очищает localStorage. При ошибке НЕ очищает (повтор при след. входе).
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const guest = useGuestDesigns()
  const toast = useToast()
  const { t } = useI18n()

  watch(user, async (u) => {
    if (!u) return
    const items = guest.list()
    if (!items.length) return
    try {
      const res = await $fetch<{ imported: number }>('/api/designs/import', {
        method: 'POST',
        body: { designs: items.map(i => ({ productId: i.productId, spec: i.spec, previewUrl: i.previewUrl })) },
      })
      guest.clear()
      if (res.imported > 0) {
        toast.add({ title: t('account.designs.importedToast', { count: res.imported }), color: 'success' })
      }
    } catch {
      /* перенос не критичен — локальные данные останутся до следующего входа */
    }
  }, { immediate: true })
})
