// Рекламные пиксели (§3.5.1). Инициализируются только если заданы ID (env).
// Без ID — плагин ничего не грузит (no-op), сайт работает как обычно.
export default defineNuxtPlugin(() => {
  const { metaPixelId, tiktokPixelId } = useRuntimeConfig().public
  const w = window as unknown as Record<string, any>

  // ── Meta / Instagram Pixel ──────────────────────────────────────
  if (metaPixelId) {
    /* eslint-disable */
    ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    })(w, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */
    w.fbq('init', metaPixelId)
    w.fbq('track', 'PageView')
  }

  // ── TikTok Pixel ────────────────────────────────────────────────
  if (tiktokPixelId) {
    /* eslint-disable */
    ;(function (w2: any, d: any, t: any) {
      w2.TiktokAnalyticsObject = t; const ttq = w2[t] = w2[t] || []
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
      ttq.setAndDefer = function (o: any, m: any) { o[m] = function () { o.push([m].concat(Array.prototype.slice.call(arguments, 0))) } }
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
      ttq.load = function (e: any) {
        const u = 'https://analytics.tiktok.com/i18n/pixel/events.js'
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = u; ttq._t = ttq._t || {}; ttq._t[e] = +new Date()
        const s = d.createElement('script'); s.type = 'text/javascript'; s.async = !0; s.src = u + '?sdkid=' + e + '&lib=' + t
        const f = d.getElementsByTagName('script')[0]; f.parentNode!.insertBefore(s, f)
      }
      ttq.load(tiktokPixelId); ttq.page()
    })(w, document, 'ttq')
    /* eslint-enable */
  }
})
