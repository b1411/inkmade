import { describe, it, expect } from 'vitest'
import {
  tenantFromHost,
  isReservedSubdomain,
  baseDomainFromSite,
  RESERVED_SUBDOMAINS,
} from '../shared/utils/tenant'

const BASE = 'inkmade.kz'

describe('baseDomainFromSite', () => {
  it('вытаскивает домен из siteUrl', () => {
    expect(baseDomainFromSite('https://inkmade.kz')).toBe('inkmade.kz')
    expect(baseDomainFromSite('https://inkmade.kz/')).toBe('inkmade.kz')
    expect(baseDomainFromSite('http://inkmade.kz:3000')).toBe('inkmade.kz')
  })
  it('отбрасывает www', () => {
    expect(baseDomainFromSite('https://www.inkmade.kz')).toBe('inkmade.kz')
  })
  it('пусто/кривое → пустая строка', () => {
    expect(baseDomainFromSite('')).toBe('')
    expect(baseDomainFromSite(null)).toBe('')
    expect(baseDomainFromSite('not a url')).toBe('')
  })
})

describe('isReservedSubdomain', () => {
  it('системные и инфра-метки зарезервированы', () => {
    for (const r of ['www', 'api', 'admin', 'shop', 's', 'ns', 'mx', 'app', 'mail']) {
      expect(isReservedSubdomain(r)).toBe(true)
    }
  })
  it('служебные/опасные формы зарезервированы', () => {
    expect(isReservedSubdomain('_acme-challenge')).toBe(true) // ACME/DNS
    expect(isReservedSubdomain('xn--80a')).toBe(true) // punycode
    expect(isReservedSubdomain('123')).toBe(true) // чисто числовая
  })
  it('регистр не важен', () => {
    expect(isReservedSubdomain('ADMIN')).toBe(true)
  })
  it('нормальный slug не зарезервирован', () => {
    expect(isReservedSubdomain('alma-crew')).toBe(false)
    expect(isReservedSubdomain('narxoz')).toBe(false)
  })
  it('список зеркалит серверный (ключевые метки на месте)', () => {
    expect(RESERVED_SUBDOMAINS.has('shop-admin')).toBe(true)
    expect(RESERVED_SUBDOMAINS.has('checkout')).toBe(true)
  })
})

describe('tenantFromHost', () => {
  it('валидный субдомен → slug', () => {
    expect(tenantFromHost('alma-crew.inkmade.kz', BASE)).toBe('alma-crew')
    expect(tenantFromHost('narxoz.inkmade.kz', BASE)).toBe('narxoz')
  })
  it('регистр и порт нормализуются', () => {
    expect(tenantFromHost('ALMA.inkmade.kz', BASE)).toBe('alma')
    expect(tenantFromHost('alma.inkmade.kz:3000', BASE)).toBe('alma')
  })
  it('хвостовая точка (FQDN) обрабатывается', () => {
    expect(tenantFromHost('alma.inkmade.kz.', BASE)).toBe('alma')
  })
  it('apex и www → null', () => {
    expect(tenantFromHost('inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('www.inkmade.kz', BASE)).toBeNull()
  })
  it('reserved-метки → null', () => {
    expect(tenantFromHost('admin.inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('api.inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('_acme-challenge.inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('123.inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('xn--80a.inkmade.kz', BASE)).toBeNull()
  })
  it('многоуровневый субдомен → null', () => {
    expect(tenantFromHost('a.b.inkmade.kz', BASE)).toBeNull()
  })
  it('чужой домен → null', () => {
    expect(tenantFromHost('alma.evil.com', BASE)).toBeNull()
    expect(tenantFromHost('inkmade.kz.evil.com', BASE)).toBeNull()
  })
  it('кривой формат slug → null', () => {
    expect(tenantFromHost('-bad.inkmade.kz', BASE)).toBeNull()
    expect(tenantFromHost('bad-.inkmade.kz', BASE)).toBeNull()
  })
  it('пустой/отсутствующий host или base → null', () => {
    expect(tenantFromHost('', BASE)).toBeNull()
    expect(tenantFromHost(null, BASE)).toBeNull()
    expect(tenantFromHost(undefined, BASE)).toBeNull()
    expect(tenantFromHost('alma.inkmade.kz', '')).toBeNull()
  })
})
