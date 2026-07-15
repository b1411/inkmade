import { describe, it, expect } from 'vitest'
import { slugify, shopSlugify } from '../app/utils/slugify'
import { safeRedirectPath } from '../app/utils/redirect'

// slug витрины = DNS-метка будущего субдомена <slug>.inkmade.kz (фаза B6), поэтому
// формат обязан совпадать с constraint shops_slug_format (0066) и проверкой в
// create_my_shop/shop_slug_available (0086): ^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$
const SHOP_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

describe('slugify — транслитерация', () => {
  it('латиница проходит как есть', () => {
    expect(slugify('UIB Store')).toBe('uib-store')
  })
  it('русский транслитерируется', () => {
    expect(slugify('Команда УИБ')).toBe('komanda-uib')
  })
  it('шипящие и мягкий знак', () => {
    expect(slugify('Мой Щёголь')).toBe('moy-schegol')
  })
  it('казахские буквы (ә, ғ, қ, ң, ө, ұ, ү, і)', () => {
    expect(slugify('Әсем Қала')).toBe('asem-qala')
    expect(slugify('Өнер Ұйым')).toBe('oner-uyym')
    expect(slugify('Ғылым Іс')).toBe('gylym-is')
  })
  it('пунктуация и пробелы схлопываются в один дефис', () => {
    expect(slugify('Наша  команда!!! №1')).toBe('nasha-komanda-1')
  })
  it('крайние дефисы срезаются', () => {
    expect(slugify('  --Бренд--  ')).toBe('brend')
  })
  it('пустой ввод не падает', () => {
    expect(slugify('')).toBe('')
    expect(slugify('!!!')).toBe('')
  })
})

describe('shopSlugify — DNS-метка витрины', () => {
  it('обрезает до 63 символов', () => {
    expect(shopSlugify('a'.repeat(80))).toHaveLength(63)
  })
  it('после обрезки не оставляет хвостовой дефис (иначе constraint отклонит)', () => {
    // 63-й символ попадает ровно на дефис → его надо срезать
    const s = shopSlugify('a'.repeat(62) + ' bbb')
    expect(s.endsWith('-')).toBe(false)
    expect(SHOP_SLUG_RE.test(s)).toBe(true)
  })
  it('результат кириллического названия валиден для БД', () => {
    for (const name of ['Команда УИБ', 'Әсем Қала', 'Мой Щёголь', 'Бренд №1']) {
      expect(SHOP_SLUG_RE.test(shopSlugify(name))).toBe(true)
    }
  })
  it('односимвольное имя валидно (regex допускает 1 символ)', () => {
    expect(shopSlugify('Я')).toBe('ya')
    expect(SHOP_SLUG_RE.test(shopSlugify('Я'))).toBe(true)
  })
})

describe('safeRedirectPath — ?redirect на auth-экранах', () => {
  it('внутренний путь проходит', () => {
    expect(safeRedirectPath('/shop-new')).toBe('/shop-new')
    expect(safeRedirectPath('/shop-claim/abc123')).toBe('/shop-claim/abc123')
  })
  it('абсолютный URL отвергается (открытый редирект)', () => {
    expect(safeRedirectPath('https://evil.example/x')).toBeNull()
    expect(safeRedirectPath('//evil.example/x')).toBeNull()
  })
  it('кабинеты отвергаются — вход ведёт в домашний путь по роли', () => {
    expect(safeRedirectPath('/admin')).toBeNull()
    expect(safeRedirectPath('/admin/shops')).toBeNull()
    expect(safeRedirectPath('/account')).toBeNull()
    expect(safeRedirectPath('/shop-admin/items')).toBeNull()
    expect(safeRedirectPath('/studio-designer')).toBeNull()
  })
  it('путь, лишь начинающийся как кабинет, НЕ отвергается', () => {
    // /accounts-help — не /account; префикс сверяется по границе сегмента
    expect(safeRedirectPath('/accounts-help')).toBe('/accounts-help')
    expect(safeRedirectPath('/administration')).toBe('/administration')
  })
  it('мусор и пустое отвергаются', () => {
    expect(safeRedirectPath(undefined)).toBeNull()
    expect(safeRedirectPath('')).toBeNull()
    expect(safeRedirectPath('shop-new')).toBeNull()
    expect(safeRedirectPath(['/a', '/b'])).toBeNull()
  })
})
