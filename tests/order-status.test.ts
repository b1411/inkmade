import { describe, it, expect } from 'vitest'
import {
  isValidTransition, TRANSITIONS, STATUS_LABELS, CUSTOMER_STATUS, REASON_REQUIRED, PRODUCTION_STAGES,
  type OrderStatus,
} from '../shared/config/order-status'

const ALL: OrderStatus[] = [
  'created', 'pending', 'paid', 'queued', 'printing', 'quality_check',
  'packing', 'ready_to_ship', 'shipped', 'delivered',
  'on_hold', 'reprint', 'cancelled', 'refunded',
]

describe('isValidTransition', () => {
  it('разрешает заявленные переходы', () => {
    expect(isValidTransition('created', 'pending')).toBe(true)
    expect(isValidTransition('paid', 'queued')).toBe(true)
    expect(isValidTransition('printing', 'quality_check')).toBe(true)
    expect(isValidTransition('shipped', 'delivered')).toBe(true)
  })

  it('запрещает незаявленные переходы', () => {
    expect(isValidTransition('created', 'paid')).toBe(false) // paid только webhook (paid не в created)
    expect(isValidTransition('delivered', 'shipped')).toBe(false) // конечный
    expect(isValidTransition('paid', 'delivered')).toBe(false) // перескок
  })

  it('конечные статусы не имеют переходов', () => {
    expect(TRANSITIONS.delivered).toEqual([])
    expect(TRANSITIONS.cancelled).toEqual([])
    expect(TRANSITIONS.refunded).toEqual([])
  })

  it('paid достижим только из pending (инвариант §10)', () => {
    const sourcesToPaid = ALL.filter(s => TRANSITIONS[s].includes('paid'))
    expect(sourcesToPaid).toEqual(['pending'])
  })
})

describe('целостность конфигов', () => {
  it('у каждого статуса есть метка и клиентская метка', () => {
    for (const s of ALL) {
      expect(STATUS_LABELS[s]).toBeTruthy()
      expect(CUSTOMER_STATUS[s]).toBeTruthy()
    }
  })

  it('все целевые статусы переходов известны', () => {
    for (const from of ALL) {
      for (const to of TRANSITIONS[from]) {
        expect(ALL).toContain(to)
      }
    }
  })

  it('производственные этапы — подмножество известных статусов', () => {
    for (const s of PRODUCTION_STAGES) expect(ALL).toContain(s)
  })

  it('переходы, требующие причину, валидны и негативны для клиента', () => {
    expect(REASON_REQUIRED).toContain('on_hold')
    expect(REASON_REQUIRED).toContain('reprint')
    expect(REASON_REQUIRED).toContain('cancelled')
    expect(REASON_REQUIRED).toContain('refunded')
  })
})
