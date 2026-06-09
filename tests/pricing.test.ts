import { describe, it, expect } from 'vitest'
import { calcPrice, zonePrintCost, PRICING } from '../shared/config/pricing'

describe('zonePrintCost', () => {
  it('fullprint — фиксированная ставка независимо от площади', () => {
    expect(zonePrintCost('fullprint', 0, 0)).toBe(PRICING.fullprintRate)
    expect(zonePrintCost('fullprint', 999, 1)).toBe(PRICING.fullprintRate)
  })

  it('zonal — пропорция площади принта к зоне', () => {
    // принт = половина зоны → 0.5 коэффициент
    expect(zonePrintCost('zonal', 50, 100)).toBe(Math.round(PRICING.zonalRatePerZone * 0.5))
  })

  it('zonal — нижняя отсечка minAreaCoef для крошечного принта', () => {
    expect(zonePrintCost('zonal', 1, 100000)).toBe(Math.round(PRICING.zonalRatePerZone * PRICING.minAreaCoef))
  })

  it('zonal — коэффициент не превышает 1 при принте больше зоны', () => {
    expect(zonePrintCost('zonal', 500, 100)).toBe(PRICING.zonalRatePerZone)
  })

  it('zonal — нулевая площадь зоны даёт 0 (защита от деления)', () => {
    expect(zonePrintCost('zonal', 100, 0)).toBe(0)
  })
})

describe('calcPrice', () => {
  it('суммирует базу, материал, метод, печать и текст', () => {
    const r = calcPrice({
      basePrice: 5000,
      materialSurcharge: 500,
      methodSurcharge: 300,
      zones: [{ mode: 'zonal', printAreaMm2: 100, zoneAreaMm2: 100 }], // коэф 1 → 1500
      hasText: true, // +500
      quantity: 1,
    })
    expect(r.print).toBe(PRICING.zonalRatePerZone)
    expect(r.text).toBe(PRICING.textCost)
    expect(r.method).toBe(300)
    expect(r.unitPrice).toBe(5000 + 500 + 300 + 1500 + 500)
    expect(r.total).toBe(r.unitPrice)
  })

  it('total умножается на количество (минимум 1)', () => {
    const base = { basePrice: 1000, materialSurcharge: 0, zones: [], hasText: false }
    expect(calcPrice({ ...base, quantity: 3 }).total).toBe(1000 * 3)
    expect(calcPrice({ ...base, quantity: 0 }).total).toBe(1000) // клампится к 1
  })

  it('без текста и без методной надбавки они равны нулю', () => {
    const r = calcPrice({ basePrice: 2000, materialSurcharge: 0, zones: [], hasText: false, quantity: 1 })
    expect(r.text).toBe(0)
    expect(r.method).toBe(0)
    expect(r.unitPrice).toBe(2000)
  })

  it('несколько зон складывают стоимость печати', () => {
    const r = calcPrice({
      basePrice: 0, materialSurcharge: 0, hasText: false, quantity: 1,
      zones: [
        { mode: 'zonal', printAreaMm2: 100, zoneAreaMm2: 100 },
        { mode: 'fullprint', printAreaMm2: 0, zoneAreaMm2: 0 },
      ],
    })
    expect(r.print).toBe(PRICING.zonalRatePerZone + PRICING.fullprintRate)
  })
})
