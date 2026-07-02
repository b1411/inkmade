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
  // aiDesign — AI-генерация принтов (text-to-design) в конструкторе. СКРЫТА до релиза
  // (включим после запуска). Код и таблицы (миграция 0056) на месте — включение = true.
  // Для работы также нужен ключ FAL_KEY в env. Гейт: вкладка «AI» + проверка флага в /api/ai/*.
  aiDesign: false,
  // b2bShops — B2B-магазины мерча на субдоменах («INKMADE для команд»). Фаза B1:
  // секция на главной + посадочная /business + форма заявки + админ-очередь заявок.
  // ВКЛЮЧЕНА (миграция 0065 shop_applications применена в проде 2026-07-02). Домен ещё
  // не куплен — архитектура работает по пути /s/<slug>, субдомены включатся в фазе B6
  // (см. docs/B2B_SHOPS_PLAN.md).
  b2bShops: true,
  // b2bStorefront — Фаза B2: публичная витрина магазина /s/<slug>, создание магазина из
  // заявки (admin approve→shop), таблицы shops/shop_items. ВЫКЛЮЧЕНА до применения
  // миграции 0066 в проде (иначе код обратится к несуществующим таблицам). Включение = true
  // (после apply 0066). Аноним читает витрину через RPC shop_storefront (RLS не светит).
  b2bStorefront: false,
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
  { prefix: '/business', enabled: FEATURES.b2bShops },
  { prefix: '/admin/shops', enabled: FEATURES.b2bShops },
  { prefix: '/s', enabled: FEATURES.b2bStorefront },
  { prefix: '/shop-admin', enabled: FEATURES.b2bStorefront },
]
