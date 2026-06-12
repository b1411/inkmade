import { describe, it, expect, beforeAll, vi } from 'vitest'

// createError — auto-import Nuxt/h3, в чистом vitest-окружении его нет.
// Подменяем глобально: бросает Error с привязанным statusCode, чтобы проверять отказы.
beforeAll(() => {
  vi.stubGlobal('createError', (opts: { statusCode?: number; statusMessage?: string }) => {
    const e = new Error(opts.statusMessage ?? 'error') as Error & { statusCode?: number }
    e.statusCode = opts.statusCode
    return e
  })
})

const {
  isUuid, requireUuid, isFinitePositive, isFiniteNonNeg, EMAIL_RE,
  validateShippingAddr, assertPlacementGeometry,
} = await import('../server/utils/validation')

const UUID = '11111111-2222-4333-8444-555555555555'

describe('isUuid', () => {
  it('принимает валидный uuid', () => expect(isUuid(UUID)).toBe(true))
  it('отвергает мусор', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(123)).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid('../../admin')).toBe(false)
  })
})

describe('requireUuid', () => {
  it('возвращает значение для валидного', () => expect(requireUuid(UUID)).toBe(UUID))
  it('бросает 400 для невалидного', () => {
    expect(() => requireUuid('x')).toThrow()
    try { requireUuid('x') } catch (e) { expect((e as { statusCode?: number }).statusCode).toBe(400) }
  })
})

describe('isFinitePositive / isFiniteNonNeg', () => {
  it('positive отсекает 0/отрицательные/NaN/Infinity/строки', () => {
    expect(isFinitePositive(10)).toBe(true)
    expect(isFinitePositive(0)).toBe(false)
    expect(isFinitePositive(-5)).toBe(false)
    expect(isFinitePositive(Infinity)).toBe(false)
    expect(isFinitePositive(NaN)).toBe(false)
    expect(isFinitePositive('10')).toBe(false)
  })
  it('nonNeg допускает 0, но не отрицательные/Infinity', () => {
    expect(isFiniteNonNeg(0)).toBe(true)
    expect(isFiniteNonNeg(-1)).toBe(false)
    expect(isFiniteNonNeg(Infinity)).toBe(false)
  })
  it('уважает верхнюю границу', () => {
    expect(isFinitePositive(1000, 100)).toBe(false)
    expect(isFinitePositive(50, 100)).toBe(true)
  })
})

describe('EMAIL_RE', () => {
  it('базовая валидация email', () => {
    expect(EMAIL_RE.test('a@b.kz')).toBe(true)
    expect(EMAIL_RE.test('no-at')).toBe(false)
    expect(EMAIL_RE.test('a@b')).toBe(false)
  })
})

describe('validateShippingAddr', () => {
  it('принимает валидный адрес', () => {
    const a = validateShippingAddr({ email: 'a@b.kz', phone: '+7 700 123 45 67', name: 'Иван' })
    expect(a.email).toBe('a@b.kz')
  })
  it('отвергает не-объект', () => {
    expect(() => validateShippingAddr(null)).toThrow()
    expect(() => validateShippingAddr('str')).toThrow()
    expect(() => validateShippingAddr([])).toThrow()
  })
  it('требует email и телефон', () => {
    expect(() => validateShippingAddr({ phone: '+7 700 123 45 67' })).toThrow()
    expect(() => validateShippingAddr({ email: 'a@b.kz', phone: '123' })).toThrow()
  })
})

describe('assertPlacementGeometry', () => {
  it('пропускает валидную геометрию и null-поля', () => {
    expect(() => assertPlacementGeometry({ width_mm: 100, height_mm: 200 })).not.toThrow()
    expect(() => assertPlacementGeometry({})).not.toThrow()
  })
  it('отвергает NaN/Infinity/отрицательные', () => {
    expect(() => assertPlacementGeometry({ width_mm: NaN })).toThrow()
    expect(() => assertPlacementGeometry({ height_mm: Infinity })).toThrow()
    expect(() => assertPlacementGeometry({ natural_w: -10 })).toThrow()
  })
})
