// Единая точка трекинга событий воронки (§3.5.1). Безопасно вызывать всегда:
// если пиксели не подключены, методы просто ничего не делают.
export const useAnalytics = () => {
  function emit(event: string, data?: Record<string, unknown>) {
    if (!import.meta.client) return
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; ttq?: { track?: (...a: unknown[]) => void } }
    w.fbq?.('track', event, data)
    w.ttq?.track?.(event, data)
  }

  return {
    viewContent: (id: string) => emit('ViewContent', { content_ids: [id] }),
    addToCart: (value: number) => emit('AddToCart', { value, currency: 'KZT' }),
    initiateCheckout: (value: number) => emit('InitiateCheckout', { value, currency: 'KZT' }),
    // событие покупки с суммой — критично для оптимизации рекламы (§3.5.1)
    purchase: (value: number, orderId: string) =>
      emit('Purchase', { value, currency: 'KZT', content_ids: [orderId] }),
    // воронка AI-генерации принтов — отдельное событие для оптимизации фичи
    aiGenerate: (success: boolean, style?: string) =>
      emit('AIGenerate', { success, style: style ?? null }),
  }
}
