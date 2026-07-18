// Конструктор витрины B2B-магазина v2 — единый контракт для кабинета (branding.vue)
// и публичной витрины (/s/<slug>). Пресеты стиля, шрифтовые стеки (только системные —
// без внешних зависимостей/CSP), раскладки hero и карточек. Значения кладутся в jsonb
// shops.theme / shops.hero / shops.layout, поэтому расширяемо без миграций схемы.

// ── Шрифтовые пресеты (системные стеки) ──────────────────────────────────────
export const SHOP_FONTS = {
  modern: `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  classic: `Georgia, 'Times New Roman', Times, serif`,
  playful: `ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif`,
} as const
export type ShopFont = keyof typeof SHOP_FONTS
export const SHOP_FONT_KEYS = Object.keys(SHOP_FONTS) as ShopFont[]

// ── Скругление углов ─────────────────────────────────────────────────────────
export const SHOP_RADII = {
  soft: '0.9rem',
  strict: '0.25rem',
} as const
export type ShopRadius = keyof typeof SHOP_RADII
export const SHOP_RADIUS_KEYS = Object.keys(SHOP_RADII) as ShopRadius[]

// ── Раскладки hero ───────────────────────────────────────────────────────────
export const HERO_LAYOUTS = ['center', 'left', 'compact'] as const
export type HeroLayout = (typeof HERO_LAYOUTS)[number]

// ── Соотношение карточки товара ──────────────────────────────────────────────
export const CARD_RATIOS = {
  portrait: '3 / 4',
  square: '1 / 1',
} as const
export type CardRatio = keyof typeof CARD_RATIOS

// ── Режим (светлая/тёмная тема) ──────────────────────────────────────────────
export const SHOP_MODES = ['light', 'dark'] as const
export type ShopMode = (typeof SHOP_MODES)[number]

// ── Готовые пресеты темы (в один клик заполняют цвета+шрифт+скругление+режим) ─
export interface ThemePreset {
  key: string
  primary: string
  accent: string
  bg: string
  font: ShopFont
  radius: ShopRadius
  mode?: ShopMode
}
export const THEME_PRESETS: ThemePreset[] = [
  { key: 'minimal', primary: '#111111', accent: '#111111', bg: '#ffffff', font: 'modern', radius: 'strict' },
  { key: 'warm', primary: '#6b1e2e', accent: '#c2703d', bg: '#faf7f2', font: 'classic', radius: 'soft' },
  { key: 'bold', primary: '#7c3aed', accent: '#f59e0b', bg: '#faf5ff', font: 'modern', radius: 'soft' },
  { key: 'fresh', primary: '#0f766e', accent: '#10b981', bg: '#f0fdfa', font: 'modern', radius: 'soft' },
  { key: 'dark', primary: '#22d3ee', accent: '#f472b6', bg: '#0f1115', font: 'modern', radius: 'soft', mode: 'dark' },
]

// ── Полные шаблоны витрины (тема + hero + секции + карточки в один клик) ─────
// В отличие от THEME_PRESETS (только цвета/шрифт/скругление), шаблон задаёт всю
// раскладку: hero (layout/overlay), какие секции включены и их порядок, форму
// карточек. Тексты (заголовок hero, объявление, «о магазине») НЕ хранятся здесь —
// они локализованы и резолвятся в кабинете по ключу `shopAdmin.templates.<key>.*`
// (kk/ru), поэтому шаблон нейтрален к языку. Владелец после применения меняет
// логотип, фото баннера и текст на свои — контакты/товары шаблон не трогает.
export interface StorefrontTemplate {
  key: string
  theme: { primary: string; accent: string; bg: string; font: ShopFont; radius: ShopRadius; mode: ShopMode }
  hero: { layout: HeroLayout; overlay: number }
  cards: { ratio: CardRatio; showPrice: boolean; showDesc: boolean }
  // какие секции включены (текст читается из i18n только для включённых)
  sections: { showHero: boolean; announcement: boolean; about: boolean; order: string[] }
}
const ORDER_DEFAULT = ['hero', 'items', 'about']
export const STOREFRONT_TEMPLATES: StorefrontTemplate[] = [
  {
    key: 'corporate',
    theme: { primary: '#1e293b', accent: '#2563eb', bg: '#ffffff', font: 'modern', radius: 'strict', mode: 'light' },
    hero: { layout: 'left', overlay: 55 },
    cards: { ratio: 'portrait', showPrice: true, showDesc: true },
    sections: { showHero: true, announcement: true, about: true, order: ORDER_DEFAULT },
  },
  {
    key: 'university',
    theme: { primary: '#6b1e2e', accent: '#c2703d', bg: '#faf7f2', font: 'classic', radius: 'soft', mode: 'light' },
    hero: { layout: 'center', overlay: 45 },
    cards: { ratio: 'portrait', showPrice: true, showDesc: true },
    sections: { showHero: true, announcement: true, about: true, order: ORDER_DEFAULT },
  },
  {
    key: 'startup',
    theme: { primary: '#7c3aed', accent: '#f59e0b', bg: '#faf5ff', font: 'modern', radius: 'soft', mode: 'light' },
    hero: { layout: 'compact', overlay: 40 },
    cards: { ratio: 'square', showPrice: true, showDesc: false },
    sections: { showHero: true, announcement: true, about: false, order: ORDER_DEFAULT },
  },
  {
    key: 'drop',
    theme: { primary: '#22d3ee', accent: '#f472b6', bg: '#0f1115', font: 'modern', radius: 'soft', mode: 'dark' },
    hero: { layout: 'center', overlay: 60 },
    cards: { ratio: 'square', showPrice: true, showDesc: false },
    sections: { showHero: true, announcement: true, about: false, order: ORDER_DEFAULT },
  },
  {
    key: 'minimal',
    theme: { primary: '#111111', accent: '#111111', bg: '#ffffff', font: 'modern', radius: 'strict', mode: 'light' },
    hero: { layout: 'left', overlay: 30 },
    cards: { ratio: 'portrait', showPrice: true, showDesc: false },
    sections: { showHero: true, announcement: false, about: false, order: ORDER_DEFAULT },
  },
]

// ── Контраст текста на брендовом цвете (WCAG-яркость) ────────────────────────
// Кнопки/строка-объявление красятся в --shop-primary; текст на них должен читаться и
// на светлом, и на тёмном primary. Считаем относительную яркость и выбираем чёрный/белый.
function luminance(hex?: string | null): number {
  const h = (hex ?? '').replace('#', '')
  if (h.length !== 6) return 0.4
  const ch = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4)
}
export const onColor = (hex?: string | null): string => (luminance(hex) > 0.5 ? '#111111' : '#ffffff')

// ── Полный резолв темы витрины (свет/тьма) ───────────────────────────────────
// Один источник цветовых токенов для витрины и превью. При mode='dark' текст/поверхности/
// границы становятся тёмными, primary/accent — как задал владелец (пресет «Тёмная» ставит
// светлый вивид). onPrimary даёт контрастный текст на кнопках/объявлении.
export interface ThemeInput {
  primary?: string | null
  accent?: string | null
  bg?: string | null
  font?: string | null
  radius?: string | null
  mode?: string | null
}
export interface ResolvedTheme {
  primary: string
  accent: string
  bg: string
  onPrimary: string
  text: string
  muted: string
  surface: string
  border: string
  font: string
  radius: string
  dark: boolean
}
export function resolveTheme(t?: ThemeInput | null): ResolvedTheme {
  const dark = t?.mode === 'dark'
  const primary = t?.primary || '#6b1e2e'
  return {
    primary,
    accent: t?.accent || primary,
    bg: t?.bg || (dark ? '#0f1115' : '#faf7f2'),
    onPrimary: onColor(primary),
    text: dark ? '#f3f4f6' : '#1a1614',
    muted: dark ? '#9aa3af' : '#6b6460',
    surface: dark ? '#1b1e25' : '#ffffff',
    border: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
    font: fontStack(t?.font),
    radius: radiusValue(t?.radius),
    dark,
  }
}

// ── Резолверы с фолбэком (витрина/превью не должны падать на кривом значении) ──
export const fontStack = (f?: string | null): string => SHOP_FONTS[(f as ShopFont)] ?? SHOP_FONTS.modern
export const radiusValue = (r?: string | null): string => SHOP_RADII[(r as ShopRadius)] ?? SHOP_RADII.soft
export const heroLayout = (l?: string | null): HeroLayout =>
  (HERO_LAYOUTS as readonly string[]).includes(l ?? '') ? (l as HeroLayout) : 'left'
export const cardRatio = (r?: string | null): string => CARD_RATIOS[(r as CardRatio)] ?? CARD_RATIOS.portrait
// затемнение баннера hero: 0..70% (число), фолбэк 45
export const heroOverlay = (n?: number | null): number =>
  typeof n === 'number' && n >= 0 && n <= 70 ? n : 45
