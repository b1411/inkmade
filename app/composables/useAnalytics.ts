export type InkAnalyticsEvent =
  | 'catalog_view'
  | 'product_view'
  | 'customize_start'
  | 'asset_added'
  | 'preflight_pass'
  | 'add_to_cart'
  | 'checkout_start'
  | 'payment_success'
  | 'order_delivered'
  | 'upload_error'
  | 'print_export_error'
  | 'simple_to_advanced'
  | 'template_used'
  | 'checkout_exit'
  | 'payment_failure'
  | 'payment_cancel'
  | 'b2b_store_created'
  | 'b2b_first_item_published'
  | 'ai_generate'

interface AnalyticsWindow {
  dataLayer?: Array<Record<string, unknown>>
  fbq?: (...args: unknown[]) => void
  ttq?: { track?: (...args: unknown[]) => void }
}

const AD_EVENT_MAP: Partial<Record<InkAnalyticsEvent, string>> = {
  product_view: 'ViewContent',
  add_to_cart: 'AddToCart',
  checkout_start: 'InitiateCheckout',
  payment_success: 'Purchase',
}

export const useAnalytics = () => {
  function track(event: InkAnalyticsEvent, data: Record<string, unknown> = {}) {
    if (!import.meta.client) return
    const payload = { event, ...data }
    const w = window as unknown as AnalyticsWindow
    w.dataLayer ||= []
    w.dataLayer.push(payload)
    window.dispatchEvent(new CustomEvent('inkmade:analytics', { detail: payload }))
    const adEvent = AD_EVENT_MAP[event]
    if (adEvent) {
      w.fbq?.('track', adEvent, data)
      w.ttq?.track?.(adEvent, data)
    }
  }

  return {
    track,
    catalogView: (category = 'all') => track('catalog_view', { category }),
    productView: (id: string) => track('product_view', { product_id: id, content_ids: [id] }),
    customizeStart: (id: string, mode = 'simple') => track('customize_start', { product_id: id, mode }),
    assetAdded: (type: string, zone?: string) => track('asset_added', { asset_type: type, zone }),
    preflightPass: (warnings: number) => track('preflight_pass', { warnings }),
    addToCart: (value: number) => track('add_to_cart', { value, currency: 'KZT' }),
    checkoutStart: (value: number) => track('checkout_start', { value, currency: 'KZT' }),
    paymentSuccess: (value: number, orderId: string) =>
      track('payment_success', { value, currency: 'KZT', order_id: orderId, content_ids: [orderId] }),
    purchase: (value: number, orderId: string) =>
      track('payment_success', { value, currency: 'KZT', order_id: orderId, content_ids: [orderId] }),
    initiateCheckout: (value: number) => track('checkout_start', { value, currency: 'KZT' }),
    viewContent: (id: string) => track('product_view', { product_id: id, content_ids: [id] }),
    aiGenerate: (success: boolean, style?: string) =>
      track('ai_generate', { success, style: style ?? null }),
  }
}
