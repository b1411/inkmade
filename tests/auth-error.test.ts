import { describe, it, expect } from 'vitest'
import { authErrorKey } from '../app/utils/authError'

// Маппинг ошибок Supabase Auth → i18n-ключ (чтобы в RU/KK UI не всплывали сырые
// англ. строки). Проверяем и по стабильному code, и по подстроке message, и fallback.
describe('authErrorKey — по code', () => {
  it('invalid_credentials', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('auth.errors.invalidCredentials')
  })
  it('email_not_confirmed', () => {
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe('auth.errors.emailNotConfirmed')
  })
  it('user_already_exists', () => {
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('auth.errors.emailExists')
  })
  it('weak_password', () => {
    expect(authErrorKey({ code: 'weak_password' })).toBe('auth.errors.weakPassword')
  })
  it('same_password', () => {
    expect(authErrorKey({ code: 'same_password' })).toBe('auth.errors.samePassword')
  })
  it('otp_expired → linkExpired', () => {
    expect(authErrorKey({ code: 'otp_expired' })).toBe('auth.errors.linkExpired')
  })
})

describe('authErrorKey — по message (нет code)', () => {
  it('Invalid login credentials', () => {
    expect(authErrorKey({ message: 'Invalid login credentials' })).toBe('auth.errors.invalidCredentials')
  })
  it('User already registered', () => {
    expect(authErrorKey({ message: 'User already registered' })).toBe('auth.errors.emailExists')
  })
  it('Email not confirmed', () => {
    expect(authErrorKey({ message: 'Email not confirmed' })).toBe('auth.errors.emailNotConfirmed')
  })
  it('rate limit по message', () => {
    expect(authErrorKey({ message: 'Email rate limit exceeded' })).toBe('auth.errors.rateLimited')
  })
})

describe('authErrorKey — по статусу и fallback', () => {
  it('429 → rateLimited', () => {
    expect(authErrorKey({ status: 429 })).toBe('auth.errors.rateLimited')
  })
  it('неизвестная ошибка → generic', () => {
    expect(authErrorKey({ message: 'boom' })).toBe('auth.errors.generic')
  })
  it('null → generic', () => {
    expect(authErrorKey(null)).toBe('auth.errors.generic')
  })
})
