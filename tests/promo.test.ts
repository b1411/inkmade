import { describe, it, expect } from 'vitest'
import { evaluatePromo, type PromoRow } from '../shared/config/promo'

const NOW = 1_700_000_000_000 // фиксированное «сейчас» для детерминизма

function promo(over: Partial<PromoRow> = {}): PromoRow {
  return {
    code: 'SALE', discount_type: 'percent', discount_value: 10,
    min_order: 0, max_uses: null, used_count: 0, active: true, expires_at: null,
    ...over,
  }
}

describe('evaluatePromo', () => {
  it('процентная скидка считается и округляется', () => {
    const r = evaluatePromo(promo({ discount_type: 'percent', discount_value: 10 }), 9990, NOW)
    expect(r?.discount).toBe(999)
  })

  it('фиксированная скидка применяется как есть', () => {
    const r = evaluatePromo(promo({ discount_type: 'fixed', discount_value: 1500 }), 9990, NOW)
    expect(r?.discount).toBe(1500)
  })

  it('скидка не превышает сумму заказа', () => {
    const r = evaluatePromo(promo({ discount_type: 'fixed', discount_value: 99999 }), 5000, NOW)
    expect(r?.discount).toBe(5000)
  })

  it('выключенный код не применяется', () => {
    expect(evaluatePromo(promo({ active: false }), 9990, NOW)).toBeNull()
  })

  it('просроченный код не применяется', () => {
    const expired = new Date(NOW - 86_400_000).toISOString()
    expect(evaluatePromo(promo({ expires_at: expired }), 9990, NOW)).toBeNull()
  })

  it('действующий срок — применяется', () => {
    const future = new Date(NOW + 86_400_000).toISOString()
    expect(evaluatePromo(promo({ expires_at: future }), 9990, NOW)).not.toBeNull()
  })

  it('исчерпанный лимит использований не применяется', () => {
    expect(evaluatePromo(promo({ max_uses: 5, used_count: 5 }), 9990, NOW)).toBeNull()
    expect(evaluatePromo(promo({ max_uses: 5, used_count: 4 }), 9990, NOW)).not.toBeNull()
  })

  it('сумма ниже минимального заказа не применяется', () => {
    expect(evaluatePromo(promo({ min_order: 10000 }), 9990, NOW)).toBeNull()
    expect(evaluatePromo(promo({ min_order: 10000 }), 10000, NOW)).not.toBeNull()
  })

  it('нулевая итоговая скидка отбрасывается', () => {
    const r = evaluatePromo(promo({ discount_type: 'percent', discount_value: 0.0001 }), 1, NOW)
    expect(r).toBeNull()
  })
})
