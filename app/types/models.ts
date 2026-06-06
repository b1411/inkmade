// Ручные доменные типы (§5). Полные типы БД сгенерируем позже:
// `supabase gen types typescript` → app/types/database.types.ts (F0-9/после применения миграций).

export type UserRole = 'customer' | 'operator' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

// ── Каталог (вложенная агрегированная форма для мастера/витрины) ───
import type { Tables } from '~/types/database.types'

export type Product = Tables<'products'>
export type Material = Tables<'materials'>
export type PrintZone = Tables<'print_zones'>
export type Variant = Tables<'variants'>
export type ProductImage = Tables<'product_images'>

export interface ProductWithRelations extends Product {
  materials: Material[]
  print_zones: PrintZone[]
  variants: Variant[]
  product_images: ProductImage[]
}

export const PRODUCT_CATEGORIES = [
  { value: 'trikotazh', label: 'Трикотаж' },
  { value: 'sport', label: 'Спортивная' },
  { value: 'verhnyaya', label: 'Верхняя' },
  { value: 'golovnye', label: 'Головные уборы' },
  { value: 'sumki', label: 'Сумки' },
] as const
