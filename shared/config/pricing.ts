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
  /** ставка за каждый спот-цвет в шелкографии (число цветов в макете), ₸ */
  silkscreenColorRate: 350,
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
  /** надбавка за метод нанесения (DTF/шелкография/вышивка), ₸ */
  methodSurcharge?: number
  /** по каждой занятой зоне: режим + площадь принта (мм²) + площадь зоны (мм²) */
  zones: { mode: PrintMode; printAreaMm2: number; zoneAreaMm2: number }[]
  hasText: boolean
  quantity: number
  /** шелкография: тарификация по числу спот-цветов в макете */
  perColorPricing?: boolean
  /** число цветов в макете (для шелкографии) */
  colorCount?: number
}

export interface PriceBreakdown {
  base: number
  material: number
  method: number
  print: number
  text: number
  colors: number
  unitPrice: number
  total: number
}

/** Полный расчёт цены позиции (§5.5). */
export function calcPrice(input: PriceInput): PriceBreakdown {
  const print = input.zones.reduce((sum, z) => sum + zonePrintCost(z.mode, z.printAreaMm2, z.zoneAreaMm2), 0)
  const text = input.hasText ? PRICING.textCost : 0
  const method = input.methodSurcharge ?? 0
  // шелкография: каждый спот-цвет = отдельный трафарет → отдельная ставка
  const colors = input.perColorPricing
    ? PRICING.silkscreenColorRate * Math.max(0, Math.round(input.colorCount ?? 0))
    : 0
  const unitPrice = Math.round(input.basePrice + input.materialSurcharge + method + print + text + colors)
  return {
    base: input.basePrice,
    material: input.materialSurcharge,
    method,
    print,
    text,
    colors,
    unitPrice,
    total: unitPrice * Math.max(1, input.quantity),
  }
}
