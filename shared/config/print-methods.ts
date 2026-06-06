// INKMADE — правило связи материал → метод → режим печати (паспорт §5.2.1).
// ЖЁСТКОЕ (перенято у vsemayki): пользователь НЕ выбирает метод абстрактно.
// Он выбирает изделие и материал, система выводит метод и режим.
//   cotton    → DTG/DTF → zonal     (зоны: грудь/спина/рукав)
//   synthetic → сублимация → fullprint (одна зона «вся поверхность»)

export type FabricType = 'cotton' | 'synthetic'
export type PrintMethod = 'dtg' | 'dtf' | 'sublimation'
export type PrintMode = 'zonal' | 'fullprint'

export interface FabricRule {
  fabric: FabricType
  label: string
  /** методы, валидные для ткани (первый — по умолчанию) */
  methods: PrintMethod[]
  mode: PrintMode
}

export const FABRIC_RULES: Record<FabricType, FabricRule> = {
  cotton: {
    fabric: 'cotton',
    label: 'Хлопок',
    methods: ['dtg', 'dtf'],
    mode: 'zonal',
  },
  synthetic: {
    fabric: 'synthetic',
    label: 'Синтетика',
    methods: ['sublimation'],
    mode: 'fullprint',
  },
}

export const PRINT_METHOD_LABELS: Record<PrintMethod, string> = {
  dtg: 'DTG (прямая цифровая)',
  dtf: 'DTF (термоперенос)',
  sublimation: 'Сублимация (full-print)',
}

export const PRINT_MODE_LABELS: Record<PrintMode, string> = {
  zonal: 'Зональная печать',
  fullprint: 'Full-print (вся поверхность)',
}

/** Режим печати по типу ткани. */
export function modeForFabric(fabric: FabricType): PrintMode {
  return FABRIC_RULES[fabric].mode
}

/** Метод по умолчанию для ткани. */
export function defaultMethodForFabric(fabric: FabricType): PrintMethod {
  return FABRIC_RULES[fabric].methods[0]!
}

/** Допустим ли метод для данной ткани (валидация на границе). */
export function isMethodValidForFabric(fabric: FabricType, method: PrintMethod): boolean {
  return FABRIC_RULES[fabric].methods.includes(method)
}
