import type { Database } from '~/types/database.types'

// Кабинет владельца B2B-магазина (Фаза B3). Владелец = customer + shops.owner_id.
// Правит брендинг/настройки своего магазина (RLS shops_owner_update; guard пускает
// только «мягкие» поля), ведёт витрину (shop_items, RLS по владению магазином),
// публикует свои сохранённые дизайны как позиции витрины.
export type Shop = Database['public']['Tables']['shops']['Row']
export type ShopItem = Database['public']['Tables']['shop_items']['Row']
export type ShopPromoCode = Database['public']['Tables']['shop_promo_codes']['Row']

// заказ магазина (RPC shop_orders) — только позиции своего магазина + минимум PII
export interface ShopOrderLine {
  title: string | null
  color_name: string | null
  size: string | null
  quantity: number
  unit_price: number
  line_total: number
}
export interface ShopOrder {
  id: string
  created_at: string
  status: string
  paid: boolean
  buyer_name: string | null
  city: string | null
  subtotal: number
  earned: number
  items: ShopOrderLine[]
}

// аналитика витрины (RPC shop_analytics) — события за N дней + продажи
export interface ShopAnalytics {
  views: number
  itemViews: number
  addToCart: number
  orders: number
  revenue: number
  daily: { day: string; views: number }[]
  topItems: { id: string; title: string; views: number; adds: number }[]
}

// поля, которые владелец МОЖЕТ менять (slug/owner/status/revenue_share — только админ, guard-триггер)
export interface ShopBrandingPatch {
  name?: string
  logo_url?: string | null
  theme?: Database['public']['Tables']['shops']['Row']['theme']
  hero?: Database['public']['Tables']['shops']['Row']['hero']
  contacts?: Database['public']['Tables']['shops']['Row']['contacts']
  layout?: Database['public']['Tables']['shops']['Row']['layout']
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

  // self-serve создание магазина (0086): владелец заводит магазин сам, без админ-approve.
  // Возвращает {id, slug}; человекочитаемые ошибки приходят из RPC (адрес занят/зарезервирован,
  // «у вас уже есть магазин») и показываются формой через getFetchMessage.
  async function createMine(name: string, slug: string): Promise<{ id: string; slug: string }> {
    const { data, error } = await supabase.rpc('create_my_shop', { p_name: name, p_slug: slug })
    if (error) throw error
    return data as unknown as { id: string; slug: string }
  }

  // живая проверка адреса витрины: {ok, reason: invalid|reserved|taken|ok}
  async function checkSlug(slug: string): Promise<{ ok: boolean; reason: string }> {
    const { data, error } = await supabase.rpc('shop_slug_available', { p_slug: slug })
    if (error) throw error
    return data as unknown as { ok: boolean; reason: string }
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

  // ── промокоды магазина (Фаза B5) — владелец заводит свои коды (RLS по владению) ──
  async function listPromos(shopId: string): Promise<ShopPromoCode[]> {
    const { data, error } = await supabase
      .from('shop_promo_codes')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async function savePromo(promo: Database['public']['Tables']['shop_promo_codes']['Insert'] & { id?: string }) {
    if (promo.id) {
      const { id, ...patch } = promo
      const { error } = await supabase.from('shop_promo_codes').update(patch).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('shop_promo_codes').insert(promo)
      if (error) throw error
    }
  }

  async function deletePromo(id: string) {
    const { error } = await supabase.from('shop_promo_codes').delete().eq('id', id)
    if (error) throw error
  }

  // финансы магазина (Фаза B4): баланс + история начислений (RLS owner/admin read)
  async function finance(shopId: string) {
    const [bal, earn, payout] = await Promise.all([
      supabase.from('shop_balances').select('*').eq('shop_id', shopId).maybeSingle(),
      supabase.from('shop_earnings')
        .select('id, amount, rate_pct, sale_base, status, created_at, order_id')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('shop_payouts')
        .select('*')
        .eq('shop_id', shopId)
        .order('requested_at', { ascending: false }),
    ])
    if (bal.error) throw bal.error
    if (earn.error) throw earn.error
    if (payout.error) throw payout.error
    return { balance: bal.data, earnings: earn.data ?? [], payouts: payout.data ?? [] }
  }

  async function requestPayout(shopId: string, method: string, details: Record<string, unknown>) {
    const { data, error } = await supabase.rpc('request_shop_payout', {
      p_shop_id: shopId,
      p_method: method,
      p_details: details as never,
    })
    if (error) throw error
    return data
  }

  // заказы магазина (Tier1 B): продажи с атрибуцией order_items.shop_id (через definer RPC)
  async function orders(shopId: string): Promise<ShopOrder[]> {
    const { data, error } = await supabase.rpc('shop_orders', { p_shop_id: shopId })
    if (error) throw error
    return (data as unknown as ShopOrder[]) ?? []
  }

  // аналитика витрины (модуль F): просмотры/в корзину/конверсия/топ за N дней
  async function analytics(shopId: string, days = 30): Promise<ShopAnalytics | null> {
    const { data, error } = await supabase.rpc('shop_analytics', { p_shop_id: shopId, p_days: days })
    if (error) throw error
    return (data as unknown as ShopAnalytics) ?? null
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

  return { getMine, createMine, checkSlug, update, uploadLogo, listItems, saveItem, deleteItem, myDesigns, finance, requestPayout, orders, analytics, listPromos, savePromo, deletePromo }
}
