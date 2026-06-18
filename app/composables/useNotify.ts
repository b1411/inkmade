// Единый брендовый API уведомлений (§4.4, §7.2) поверх Nuxt UI useToast.
// Микрокопи из ТЗ §7.2 — пресеты для частых событий, чтобы не дублировать строки.
export function useNotify() {
  const toast = useToast()
  const { t } = useI18n()

  const success = (title: string, description?: string) =>
    toast.add({ title, description, color: 'success', icon: 'i-lucide-check' })
  const error = (title: string, description?: string) =>
    toast.add({ title, description, color: 'error', icon: 'i-lucide-circle-x' })
  const info = (title: string, description?: string) =>
    toast.add({ title, description, color: 'info', icon: 'i-lucide-info' })
  const warn = (title: string, description?: string) =>
    toast.add({ title, description, color: 'warning', icon: 'i-lucide-triangle-alert' })

  return {
    success,
    error,
    info,
    warn,
    // Пресеты ТЗ §7.2
    addedToCart: () =>
      toast.add({ title: t('notify.addedToCart'), color: 'success', icon: 'i-lucide-shopping-cart' }),
    linkCopied: () =>
      toast.add({ title: t('notify.linkCopied'), color: 'success', icon: 'i-lucide-link' }),
    paymentFailed: () =>
      toast.add({ title: t('notify.paymentFailed'), color: 'error', icon: 'i-lucide-credit-card' }),
  }
}
