import type { Database } from '~/types/database.types'

// Кабинет владельца B2B-магазина (Фаза B3). Владелец = customer + shops.owner_id.
// Правит брендинг/настройки своего магазина (RLS shops_owner_update; guard пускает
// только «мягкие» поля), ведёт витрину (shop_items, RLS по владению магазином),
// публикует свои сохранённые дизайны как позиции витрины.
export type Shop = Database['public']['Tables']['shops']['Row']
export type ShopItem = Database['public']['Tables']['shop_items']['Row']

// поля, которые владелец МОЖЕТ менять (slug/owner/status/revenue_share — только админ, guard-триггер)
export interface ShopBrandingPatch {
  name?: string
  logo_url?: string | null
  theme?: Database['public']['Tables']['shops']['Row']['theme']
  hero?: Database['public']['Tables']['shops']['Row']['hero']
  contacts?: Database['public']['Tables']['shops']['Row']['contacts']
  is_public?: boolean
  access_code?: string | null
}

export const useMyShop = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function getMine(): Promise<Shop | null> {
    if (!user.value) return null
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.value.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function update(id: string, patch: ShopBrandingPatch) {
    const { error } = await supabase.from('shops').update(patch).eq('id', id)
    if (error) throw error
  }

  // логотип магазина → публичный бакет design-uploads, путь shops/<id>/…
  async function uploadLogo(shopId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png'
    const path = `shops/${shopId}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('design-uploads').upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    return supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
  }

  // ── витрина ──────────────────────────────────────────────────────────────
  async function listItems(shopId: string): Promise<ShopItem[]> {
    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('shop_id', shopId)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }

  async function saveItem(item: Database['public']['Tables']['shop_items']['Insert'] & { id?: string }) {
    if (item.id) {
      const { id, ...patch } = item
      const { error } = await supabase.from('shop_items').update(patch).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('shop_items').insert(item)
      if (error) throw error
    }
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from('shop_items').delete().eq('id', id)
    if (error) throw error
  }

  // сохранённые дизайны владельца — кандидаты в позиции витрины
  async function myDesigns() {
    if (!user.value) return []
    const { data, error } = await supabase
      .from('designs')
      .select('id, title, preview_url, product_id, variant_id, created_at')
      .eq('user_id', user.value.id)
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  return { getMine, update, uploadLogo, listItems, saveItem, deleteItem, myDesigns }
}
