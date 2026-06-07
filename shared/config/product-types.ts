// INKMADE — справочник шаблонов типов изделий (§6, каркас каталога).
// Админ выбирает тип в мастере → поля и заготовки (материал, размеры, цвета,
// зоны, max_print) подставляются автоматически. Числа референсные (§10),
// финальные значения админ правит под спецификацию поставщика.
import type { FabricType } from './print-methods'

export interface ColorOption {
  name: string
  hex: string
  is_dark: boolean
}

// Базовая палитра текстиля (можно расширять в шаблонах).
export const TEXTILE_COLORS: ColorOption[] = [
  { name: 'Чёрный', hex: '#111111', is_dark: true },
  { name: 'Белый', hex: '#FBF8F2', is_dark: false },
  { name: 'Серый меланж', hex: '#9A9A9A', is_dark: false },
  { name: 'Бордо', hex: '#7A1F28', is_dark: true },
  { name: 'Бежевый', hex: '#EFE0C1', is_dark: false },
  { name: 'Тёмно-синий', hex: '#1E2A44', is_dark: true },
]

const CORE = TEXTILE_COLORS.slice(0, 4) // чёрный/белый/серый/бордо — для стартовых вариантов

export interface ProductTypeTemplate {
  key: string
  title: string // дефолтное название товара
  categorySlug: string
  fabric: FabricType
  sizes: string[]
  colors: ColorOption[]
  basePrice: number // ₸, референс
  maxPrintMm: { width: number; height: number }
  zonePresets: string[] // имена из shared/config/zones.ts
  description: string
}

const APPAREL = ['S', 'M', 'L', 'XL', 'XXL']
const OVERSIZE = ['S', 'M', 'L', 'XL']

export const PRODUCT_TYPE_TEMPLATES: ProductTypeTemplate[] = [
  {
    key: 'tshirt', title: 'Футболка', categorySlug: 'textile', fabric: 'cotton',
    sizes: APPAREL, colors: CORE, basePrice: 4990,
    maxPrintMm: { width: 300, height: 420 },
    zonePresets: ['chest', 'back', 'sleeve_left', 'sleeve_right'],
    description: 'Классическая хлопковая футболка, прямой крой.',
  },
  {
    key: 'tshirt_oversize', title: 'Футболка оверсайз', categorySlug: 'textile', fabric: 'cotton',
    sizes: OVERSIZE, colors: CORE, basePrice: 6490,
    maxPrintMm: { width: 320, height: 450 },
    zonePresets: ['chest', 'back'],
    description: 'Свободный оверсайз-крой, спущенное плечо, плотный хлопок.',
  },
  {
    key: 'polo', title: 'Поло', categorySlug: 'textile', fabric: 'cotton',
    sizes: APPAREL, colors: CORE, basePrice: 7990,
    maxPrintMm: { width: 250, height: 300 },
    zonePresets: ['chest', 'back'],
    description: 'Рубашка-поло с воротником, пике.',
  },
  {
    key: 'sweatshirt', title: 'Свитшот', categorySlug: 'textile', fabric: 'cotton',
    sizes: APPAREL, colors: CORE, basePrice: 8990,
    maxPrintMm: { width: 300, height: 400 },
    zonePresets: ['chest', 'back'],
    description: 'Свитшот с начёсом, без капюшона.',
  },
  {
    key: 'hoodie', title: 'Худи', categorySlug: 'textile', fabric: 'cotton',
    sizes: APPAREL, colors: CORE, basePrice: 10990,
    maxPrintMm: { width: 300, height: 400 },
    zonePresets: ['chest', 'back'],
    description: 'Худи с капюшоном и карманом-кенгуру, плотный футер.',
  },
  {
    key: 'cap', title: 'Кепка', categorySlug: 'textile', fabric: 'cotton',
    sizes: ['OS'], colors: CORE.slice(0, 3), basePrice: 4490,
    maxPrintMm: { width: 120, height: 80 },
    zonePresets: ['cap_front'],
    description: 'Бейсболка, регулируемая застёжка, один размер.',
  },
]

export function getTemplate(key: string): ProductTypeTemplate | undefined {
  return PRODUCT_TYPE_TEMPLATES.find(t => t.key === key)
}
