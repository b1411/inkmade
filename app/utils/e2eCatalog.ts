import type { Tables } from '~/types/database.types'
import type { ProductWithRelations } from '~/types/models'

const PRODUCT_ID = '00000000-0000-4000-8000-000000000101'
const MATERIAL_ID = '00000000-0000-4000-8000-000000000201'

const zones: ProductWithRelations['print_zones'] = [
  {
    id: '00000000-0000-4000-8000-000000000301',
    product_id: PRODUCT_ID,
    name: 'chest',
    title: 'Грудь',
    print_mode: 'zonal',
    bounds_mm: { x: 55, y: 70, width: 200, height: 250 },
    bounds_canvas: { x: 0.365, y: 0.27, width: 0.27, height: 0.35 },
    max_width_mm: 200,
    max_height_mm: 250,
    min_dpi: 150,
    mockup_url: '/media/products/blank/classic-black-v01.webp',
    placement_hint: 'Основная зона печати на груди',
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    product_id: PRODUCT_ID,
    name: 'back',
    title: 'Спина',
    print_mode: 'zonal',
    bounds_mm: { x: 50, y: 60, width: 300, height: 400 },
    bounds_canvas: { x: 0.29, y: 0.2, width: 0.42, height: 0.52 },
    max_width_mm: 300,
    max_height_mm: 400,
    min_dpi: 150,
    mockup_url: '/media/products/blank/classic-black-v01.webp',
    placement_hint: 'Крупная зона печати на спине',
  },
]

const product: ProductWithRelations = {
  id: PRODUCT_ID,
  slug: 'tshirt',
  alias: 'tshirt',
  title: 'Футболка',
  description: 'Классическая футболка для детерминированной E2E-проверки.',
  category: 'textile',
  base_price: 4990,
  created_at: '2026-01-01T00:00:00.000Z',
  is_active: true,
  is_featured: true,
  max_print_mm: { width: 300, height: 400 },
  max_size_label: 'XL',
  fit: { label: 'Классическая посадка', composition: '100% хлопок', densityGsm: 220 },
  size_chart: [
    { size: 'S', chestCm: 50, lengthCm: 68 },
    { size: 'M', chestCm: 53, lengthCm: 71 },
    { size: 'L', chestCm: 56, lengthCm: 74 },
  ],
  materials: [{
    id: MATERIAL_ID,
    product_id: PRODUCT_ID,
    name: 'Плотный хлопок',
    fabric_type: 'cotton',
    print_method: 'dtf',
    print_mode: 'zonal',
    surcharge: 0,
  }],
  print_zones: zones,
  variants: ['S', 'M', 'L'].map((size, index) => ({
    id: `00000000-0000-4000-8000-0000000004${index + 1}`,
    product_id: PRODUCT_ID,
    material_id: MATERIAL_ID,
    size,
    sku: `E2E-TSHIRT-BLACK-${size}`,
    color_name: 'Чёрный',
    color_hex: '#111111',
    stock: 20,
    blank_cost: 2500,
  })),
  product_images: [{
    id: '00000000-0000-4000-8000-000000000501',
    product_id: PRODUCT_ID,
    url: '/media/products/blank/classic-black-v01.webp',
    alt: 'Чёрная футболка',
    label: 'Спереди',
    kind: 'mockup',
    color_hex: '#111111',
    is_primary: true,
    is_hidden: false,
    sort_order: 0,
  }],
}

export const e2eCategories: Tables<'categories'>[] = [{
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'textile',
  title: 'Футболки',
  icon: 'i-lucide-shirt',
  is_active: true,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00.000Z',
}]

export function e2eProduct(): ProductWithRelations {
  return structuredClone(product)
}

export function isE2eSeededCatalog(): boolean {
  return useRuntimeConfig().public.e2eSeeded === true
}
