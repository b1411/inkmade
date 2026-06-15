import { describe, it, expect } from 'vitest'
import { normalizeKzPhone, isValidKzPhone, formatKzPhone, whatsAppLink, telLink } from '../shared/config/phone'

describe('normalizeKzPhone', () => {
  it('нормализует +7 700 123 45 67', () => {
    expect(normalizeKzPhone('+7 700 123 45 67')).toBe('+77001234567')
  })
  it('нормализует 8 (700) 123-45-67 → +7', () => {
    expect(normalizeKzPhone('8 (700) 123-45-67')).toBe('+77001234567')
  })
  it('нормализует 10-значный 7001234567 (без кода страны)', () => {
    expect(normalizeKzPhone('7001234567')).toBe('+77001234567')
  })
  it('отвергает не-мобильный/мусор', () => {
    expect(normalizeKzPhone('+7 495 123 45 67')).toBeNull() // не 77 (не мобильный)
    expect(normalizeKzPhone('12345')).toBeNull()
    expect(normalizeKzPhone('')).toBeNull()
    expect(normalizeKzPhone(null)).toBeNull()
  })
})

describe('isValidKzPhone', () => {
  it('true для валидного', () => {
    expect(isValidKzPhone('+77071234567')).toBe(true)
  })
  it('false для невалидного', () => {
    expect(isValidKzPhone('abc')).toBe(false)
  })
})

describe('formatKzPhone', () => {
  it('форматирует в читаемый вид', () => {
    expect(formatKzPhone('+77001234567')).toBe('+7 (700) 123-45-67')
  })
})

describe('whatsAppLink / telLink', () => {
  it('строит wa.me без +', () => {
    expect(whatsAppLink('+77001234567')).toBe('https://wa.me/77001234567')
  })
  it('добавляет текст', () => {
    expect(whatsAppLink('+77001234567', 'Привет')).toBe('https://wa.me/77001234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82')
  })
  it('null на невалидном', () => {
    expect(whatsAppLink('123')).toBeNull()
    expect(telLink('123')).toBeNull()
  })
  it('tel-ссылка', () => {
    expect(telLink('8 700 123 45 67')).toBe('tel:+77001234567')
  })
})
