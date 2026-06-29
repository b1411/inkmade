// Feature-флаги запуска. Выключенная фича скрыта ПОЛНОСТЬЮ: нет ссылок в меню,
// нет секций на лендинге, её роуты отдают 404. Код при этом остаётся в репозитории —
// чтобы вернуть фичу, достаточно поставить флаг в `true` (без переписывания).
//
// Что выключено сейчас (решение перед запуском, см. memory/inkmade-launch-scope):
//   designerMarketplace — дизайнерский маркетплейс/рефералка (роялти, выплаты,
//     инвайты, публичные витрины дизайнеров).
//   advancedAdmin       — «тяжёлая» админка, не нужная на старте (финансы, CRM
//     клиентов, лиды, прайсинг/промо, аудит-лог, контент-редактор, юр-документы).
export const FEATURES = {
  designerMarketplace: false,
  advancedAdmin: true,
} as const

// Префиксы роутов, скрываемых вместе с фичей. Используются глобальным
// middleware (app/middleware/feature-flags.global.ts), который отдаёт 404,
// пока соответствующая фича выключена.
export const FEATURE_ROUTES: { prefix: string; enabled: boolean }[] = [
  { prefix: '/studio-designer', enabled: FEATURES.designerMarketplace },
  { prefix: '/designer', enabled: FEATURES.designerMarketplace },
  { prefix: '/invite', enabled: FEATURES.designerMarketplace },
  { prefix: '/admin/designers', enabled: FEATURES.designerMarketplace },
  { prefix: '/admin/finance', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/customers', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/leads', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/pricing', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/audit', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/content', enabled: FEATURES.advancedAdmin },
  { prefix: '/admin/legal', enabled: FEATURES.advancedAdmin },
]
