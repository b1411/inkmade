import type { Database } from '~/types/database.types'
import type { ProductWithRelations } from '~/types/models'

// Публичная витрина (§6, §12.5). RLS отдаёт только опубликованные товары (is_active).
export const useCatalog = () => {
  const supabase = useSupabaseClient<Database>()

  /** Товары категории с основным фото (для плиток). */
  async function listByCategory(category: string) {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, alias, title, base_price, category, created_at, product_images(url, is_primary)')
      .eq('category', category)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  /** Все опубликованные товары (для блока «Выбери основу» на главной). */
  async function listAll() {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, alias, title, base_price, category, is_featured, created_at, product_images(url, is_primary)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  /** Полная карточка товара по slug (для страницы товара/конструктора). */
  async function getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, materials(*), print_zones(*), variants(*), product_images(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    if (error) throw error
    return data as ProductWithRelations
  }

  /** Карточка по alias (URL конструктора, §7.1.1). */
  async function getByAlias(alias: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, materials(*), print_zones(*), variants(*), product_images(*)')
      .eq('alias', alias)
      .eq('is_active', true)
      .single()
    if (error) throw error
    return data as ProductWithRelations
  }

  return { listByCategory, listAll, getBySlug, getByAlias }
}
