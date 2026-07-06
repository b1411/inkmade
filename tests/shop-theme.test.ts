import { describe, it, expect } from 'vitest'
import {
  resolveTheme,
  onColor,
  fontStack,
  radiusValue,
  heroLayout,
  cardRatio,
  heroOverlay,
  THEME_PRESETS,
  SHOP_FONTS,
  SHOP_RADII,
} from '../shared/config/shop-theme'

// Движок темы витрины B2B-магазина (shared/config/shop-theme.ts). Единый источник
// цветовых токенов для витрины /s/<slug> и превью в кабинете. Логика чистая —
// покрываем контраст (WCAG), резолв свет/тьма и фолбэки кривых значений.

describe('onColor — контрастный текст на брендовом цвете', () => {
  it('на белом фоне текст тёмный', () => {
    expect(onColor('#ffffff')).toBe('#111111')
  })
  it('на чёрном фоне текст белый', () => {
    expect(onColor('#000000')).toBe('#ffffff')
  })
  it('на тёмно-бордовом (дефолтный primary) текст белый', () => {
    expect(onColor('#6b1e2e')).toBe('#ffffff')
  })
  it('на светлом циане (тёмный пресет) текст тёмный', () => {
    expect(onColor('#22d3ee')).toBe('#111111')
  })
  it('кривой/короткий hex не роняет — безопасный фолбэк (белый)', () => {
    expect(onColor('#fff')).toBe('#ffffff') // длина != 6
    expect(onColor('нет-цвета')).toBe('#ffffff')
    expect(onColor('')).toBe('#ffffff')
    expect(onColor(null)).toBe('#ffffff')
    expect(onColor(undefined)).toBe('#ffffff')
  })
})

describe('resolveTheme — светлая тема (по умолчанию)', () => {
  const rt = resolveTheme(null)
  it('дефолтные цвета бренда', () => {
    expect(rt.primary).toBe('#6b1e2e')
    expect(rt.bg).toBe('#faf7f2')
    expect(rt.dark).toBe(false)
  })
  it('accent повторяет primary, если не задан', () => {
    expect(rt.accent).toBe('#6b1e2e')
  })
  it('светлые поверхности/текст', () => {
    expect(rt.text).toBe('#1a1614')
    expect(rt.surface).toBe('#ffffff')
    expect(rt.muted).toBe('#6b6460')
  })
  it('onPrimary — контрастный к primary', () => {
    expect(rt.onPrimary).toBe('#ffffff')
  })
  it('шрифт/скругление — дефолтные пресеты', () => {
    expect(rt.font).toBe(SHOP_FONTS.modern)
    expect(rt.radius).toBe(SHOP_RADII.soft)
  })
})

describe('resolveTheme — тёмная тема (mode: dark)', () => {
  const rt = resolveTheme({ mode: 'dark', primary: '#22d3ee' })
  it('флаг dark выставлен', () => {
    expect(rt.dark).toBe(true)
  })
  it('тёмный фон по умолчанию', () => {
    expect(rt.bg).toBe('#0f1115')
  })
  it('светлый текст, тёмная поверхность, полупрозрачная граница', () => {
    expect(rt.text).toBe('#f3f4f6')
    expect(rt.surface).toBe('#1b1e25')
    expect(rt.muted).toBe('#9aa3af')
    expect(rt.border).toBe('rgba(255,255,255,0.10)')
  })
  it('primary владельца сохраняется, onPrimary пересчитан', () => {
    expect(rt.primary).toBe('#22d3ee')
    expect(rt.onPrimary).toBe('#111111')
  })
  it('явный bg перекрывает дефолт тёмной темы', () => {
    expect(resolveTheme({ mode: 'dark', bg: '#101820' }).bg).toBe('#101820')
  })
})

describe('resolveTheme — кастомные цвета', () => {
  it('primary/accent/bg пробрасываются как заданы', () => {
    const rt = resolveTheme({ primary: '#0f766e', accent: '#10b981', bg: '#f0fdfa' })
    expect(rt.primary).toBe('#0f766e')
    expect(rt.accent).toBe('#10b981')
    expect(rt.bg).toBe('#f0fdfa')
    expect(rt.dark).toBe(false)
  })
  it('пустые строки → фолбэк на дефолты', () => {
    const rt = resolveTheme({ primary: '', accent: '', bg: '' })
    expect(rt.primary).toBe('#6b1e2e')
    expect(rt.accent).toBe('#6b1e2e')
    expect(rt.bg).toBe('#faf7f2')
  })
})

describe('fontStack — резолв шрифтового пресета', () => {
  it('известный пресет → системный стек', () => {
    expect(fontStack('classic')).toBe(SHOP_FONTS.classic)
    expect(fontStack('playful')).toBe(SHOP_FONTS.playful)
  })
  it('неизвестное/пустое → modern', () => {
    expect(fontStack('нет-такого')).toBe(SHOP_FONTS.modern)
    expect(fontStack(null)).toBe(SHOP_FONTS.modern)
    expect(fontStack(undefined)).toBe(SHOP_FONTS.modern)
  })
})

describe('radiusValue — резолв скругления', () => {
  it('strict → строгое, soft → мягкое', () => {
    expect(radiusValue('strict')).toBe('0.25rem')
    expect(radiusValue('soft')).toBe('0.9rem')
  })
  it('неизвестное → soft (фолбэк)', () => {
    expect(radiusValue('нет')).toBe('0.9rem')
    expect(radiusValue(null)).toBe('0.9rem')
  })
})

describe('heroLayout — раскладка hero', () => {
  it('валидные значения', () => {
    expect(heroLayout('center')).toBe('center')
    expect(heroLayout('compact')).toBe('compact')
    expect(heroLayout('left')).toBe('left')
  })
  it('кривое/пустое → left (фолбэк)', () => {
    expect(heroLayout('')).toBe('left')
    expect(heroLayout('нет')).toBe('left')
    expect(heroLayout(null)).toBe('left')
    expect(heroLayout(undefined)).toBe('left')
  })
})

describe('cardRatio — соотношение карточки товара', () => {
  it('square → 1/1, portrait → 3/4', () => {
    expect(cardRatio('square')).toBe('1 / 1')
    expect(cardRatio('portrait')).toBe('3 / 4')
  })
  it('неизвестное → portrait (фолбэк)', () => {
    expect(cardRatio('нет')).toBe('3 / 4')
    expect(cardRatio(null)).toBe('3 / 4')
  })
})

describe('heroOverlay — затемнение баннера (0..70, фолбэк 45)', () => {
  it('число в диапазоне сохраняется, включая границы', () => {
    expect(heroOverlay(0)).toBe(0)
    expect(heroOverlay(30)).toBe(30)
    expect(heroOverlay(70)).toBe(70)
  })
  it('вне диапазона → 45', () => {
    expect(heroOverlay(71)).toBe(45)
    expect(heroOverlay(-1)).toBe(45)
  })
  it('не число → 45', () => {
    expect(heroOverlay(null)).toBe(45)
    expect(heroOverlay(undefined)).toBe(45)
  })
})

describe('THEME_PRESETS — готовые пресеты витрины', () => {
  it('ключи уникальны', () => {
    const keys = THEME_PRESETS.map(p => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('пресет «minimal» — светлый, белый фон', () => {
    const p = THEME_PRESETS.find(x => x.key === 'minimal')!
    expect(resolveTheme(p).dark).toBe(false)
    expect(resolveTheme(p).bg).toBe('#ffffff')
  })
  it('пресет «dark» — тёмный режим', () => {
    const p = THEME_PRESETS.find(x => x.key === 'dark')!
    expect(p.mode).toBe('dark')
    expect(resolveTheme(p).dark).toBe(true)
  })
  it('каждый пресет резолвится и даёт валидный контрастный текст', () => {
    for (const p of THEME_PRESETS) {
      const rt = resolveTheme(p)
      expect(rt.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['#111111', '#ffffff']).toContain(rt.onPrimary)
      expect(rt.font).toBeTruthy()
      expect(rt.radius).toBeTruthy()
    }
  })
})
