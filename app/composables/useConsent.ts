// Согласие на аналитику/рекламу (cookie-баннер, opt-in). Хранится в localStorage
// на стороне браузера. Пиксели Meta/TikTok инициализируются ТОЛЬКО при 'accepted'
// (см. app/plugins/analytics.client.ts). До решения пользователя — ничего не грузим.
export type CookieConsent = 'accepted' | 'rejected'

// В ключе — версия: при существенном изменении состава трекеров бампнуть (v2),
// чтобы у пользователей заново спросить согласие.
const STORAGE_KEY = 'inkmade:cookie-consent:v1'

export function useConsent() {
  // useState — реактивное общее состояние (плагин аналитики + баннер видят одно и то же).
  const consent = useState<CookieConsent | null>('cookie-consent', () => null)

  function load() {
    if (!import.meta.client) return
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'accepted' || v === 'rejected') consent.value = v
    } catch { /* приватный режим / заблокированный storage — считаем «не решено» */ }
  }

  function set(v: CookieConsent) {
    consent.value = v
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY, v) } catch { /* no-op */ }
    }
  }

  return {
    consent,
    decided: computed(() => consent.value !== null),
    accepted: computed(() => consent.value === 'accepted'),
    load,
    accept: () => set('accepted'),
    reject: () => set('rejected'),
  }
}
