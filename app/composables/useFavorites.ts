import type { Database } from '~/types/database.types'

// Избранное клиента (CRM §3.1): товары и принты. RLS — только свои.
export const useFavorites = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function listProducts() {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, product_id, products(id, title, slug, alias, base_price, product_images(url, is_primary))')
      .not('product_id', 'is', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function listPrints() {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, print_id, print_library(id, title, thumbnail_url, file_url)')
      .not('print_id', 'is', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function isProductFav(productId: string): Promise<string | null> {
    const { data } = await supabase.from('favorites').select('id').eq('product_id', productId).maybeSingle()
    return data?.id ?? null
  }

  async function toggleProduct(productId: string): Promise<boolean> {
    if (!user.value) throw new Error('Требуется вход')
    const existing = await isProductFav(productId)
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing)
      return false
    }
    await supabase.from('favorites').insert({ user_id: user.value.id, product_id: productId })
    return true
  }

  async function togglePrint(printId: string): Promise<boolean> {
    if (!user.value) throw new Error('Требуется вход')
    const { data } = await supabase.from('favorites').select('id').eq('print_id', printId).maybeSingle()
    if (data?.id) {
      await supabase.from('favorites').delete().eq('id', data.id)
      return false
    }
    await supabase.from('favorites').insert({ user_id: user.value.id, print_id: printId })
    return true
  }

  async function remove(id: string) {
    await supabase.from('favorites').delete().eq('id', id)
  }

  return { listProducts, listPrints, isProductFav, toggleProduct, togglePrint, remove }
}
