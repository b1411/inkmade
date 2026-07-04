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

// ── Готовые пресеты темы (в один клик заполняют цвета+шрифт+скругление) ───────
export interface ThemePreset {
  key: string
  primary: string
  accent: string
  bg: string
  font: ShopFont
  radius: ShopRadius
}
export const THEME_PRESETS: ThemePreset[] = [
  { key: 'minimal', primary: '#111111', accent: '#111111', bg: '#ffffff', font: 'modern', radius: 'strict' },
  { key: 'warm', primary: '#6b1e2e', accent: '#c2703d', bg: '#faf7f2', font: 'classic', radius: 'soft' },
  { key: 'bold', primary: '#7c3aed', accent: '#f59e0b', bg: '#faf5ff', font: 'modern', radius: 'soft' },
  { key: 'fresh', primary: '#0f766e', accent: '#10b981', bg: '#f0fdfa', font: 'modern', radius: 'soft' },
]

// ── Резолверы с фолбэком (витрина/превью не должны падать на кривом значении) ──
export const fontStack = (f?: string | null): string => SHOP_FONTS[(f as ShopFont)] ?? SHOP_FONTS.modern
export const radiusValue = (r?: string | null): string => SHOP_RADII[(r as ShopRadius)] ?? SHOP_RADII.soft
export const heroLayout = (l?: string | null): HeroLayout =>
  (HERO_LAYOUTS as readonly string[]).includes(l ?? '') ? (l as HeroLayout) : 'left'
export const cardRatio = (r?: string | null): string => CARD_RATIOS[(r as CardRatio)] ?? CARD_RATIOS.portrait
// затемнение баннера hero: 0..70% (число), фолбэк 45
export const heroOverlay = (n?: number | null): number =>
  typeof n === 'number' && n >= 0 && n <= 70 ? n : 45
