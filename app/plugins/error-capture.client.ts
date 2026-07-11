// Клиентский перехват необработанных ошибок → сервер (аудит 2026-07-12 #4).
// Раньше исключения Vue/промисов в браузере (конструктор, чекаут) были невидимы на
// сервере — баг вскрывался только по жалобе пользователя. Ловим через штатные хуки
// Nuxt (не клоббер vueApp.config.errorHandler) + window-события, дедупим и throttle-им,
// шлём best-effort через sendBeacon (не блокирует, переживает уход со страницы).
export default defineNuxtPlugin((nuxtApp) => {
  const seen = new Set<string>()
  let count = 0
  const MAX_PER_SESSION = 20

  function report(kind: string, message: string, stack?: string) {
    if (count >= MAX_PER_SESSION) return
    const key = `${kind}:${message}`.slice(0, 200)
    if (seen.has(key)) return
    seen.add(key)
    count++
    const payload = JSON.stringify({
      kind,
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 2000) : undefined,
      url: window.location?.href,
    })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/telemetry/client-error', new Blob([payload], { type: 'application/json' }))
      } else {
        void $fetch('/api/telemetry/client-error', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' } })
      }
    } catch { /* best-effort, не мешаем UX */ }
  }

  nuxtApp.hook('vue:error', (err, _instance, info) => {
    const e = err as Error
    report('vue', `${e?.message ?? err} [${info}]`, e?.stack)
  })
  nuxtApp.hook('app:error', (err) => {
    const e = err as Error
    report('app', e?.message ?? String(err), e?.stack)
  })
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason as { message?: string; stack?: string } | undefined
    report('promise', r?.message ?? String(ev.reason), r?.stack)
  })
})
