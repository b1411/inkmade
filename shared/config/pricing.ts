// INKMADE — формула цены (паспорт §5.5). Калькулятор обязан давать ту же цену,
// что ляжет в order_items.unit_price. Ставки в конфиге, не в компонентах.
import type { PrintMode } from './print-methods'

export const PRICING = {
  /** ставка за занятую зону (zonal), множится на коэффициент площади принта */
  zonalRatePerZone: 1500,
  /** фиксированная ставка full-print (одна «зона» = вся поверхность) */
  fullprintRate: 3500,
  /** надбавка за текстовый элемент */
  textCost: 500,
  /** минимальный коэффициент площади, чтобы маленький принт не стоил почти 0 */
  minAreaCoef: 0.15,
}

/**
 * Стоимость печати одной зоны (§5.5).
 * zonal: ставка × (площадь bbox принта / площадь зоны), с нижней отсечкой.
 * fullprint: фиксированная ставка.
 */
export function zonePrintCost(mode: PrintMode, printAreaMm2: number, zoneAreaMm2: number): number {
  if (mode === 'fullprint') return PRICING.fullprintRate
  if (zoneAreaMm2 <= 0) return 0
  const coef = Math.max(PRICING.minAreaCoef, Math.min(1, printAreaMm2 / zoneAreaMm2))
  return Math.round(PRICING.zonalRatePerZone * coef)
}

export interface PriceInput {
  basePrice: number
  materialSurcharge: number
  /** по каждой занятой зоне: режим + площадь принта (мм²) + площадь зоны (мм²) */
  zones: { mode: PrintMode; printAreaMm2: number; zoneAreaMm2: number }[]
  hasText: boolean
  quantity: number
}

export interface PriceBreakdown {
  base: number
  material: number
  print: number
  text: number
  unitPrice: number
  total: number
}

/** Полный расчёт цены позиции (§5.5). */
export function calcPrice(input: PriceInput): PriceBreakdown {
  const print = input.zones.reduce((sum, z) => sum + zonePrintCost(z.mode, z.printAreaMm2, z.zoneAreaMm2), 0)
  const text = input.hasText ? PRICING.textCost : 0
  const unitPrice = Math.round(input.basePrice + input.materialSurcharge + print + text)
  return {
    base: input.basePrice,
    material: input.materialSurcharge,
    print,
    text,
    unitPrice,
    total: unitPrice * Math.max(1, input.quantity),
  }
}
