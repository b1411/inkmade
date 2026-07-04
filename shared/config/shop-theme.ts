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
