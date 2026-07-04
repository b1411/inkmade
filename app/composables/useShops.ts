import type { Database } from '~/types/database.types'

// B2B-магазины, Фаза B2 (docs/B2B_SHOPS_PLAN.md). Публичная витрина отдаётся через
// SECURITY DEFINER RPC shop_storefront (аноним не видит access_code/приватные поля).
// Админ создаёт магазин из заявки (admin_create_shop) и видит список (admin_list_shops).

export interface ShopTheme { primary?: string; bg?: string; accent?: string }
export interface ShopHero { title?: string; subtitle?: string; banner_url?: string }
export interface ShopContacts { instagram?: string; phone?: string; whatsapp?: string }

export interface StorefrontShop {
  id: string
  slug: string
  name: string
  logo_url: string | null
  theme: ShopTheme
  hero: ShopHero
  contacts: ShopContacts
  closed_mode: boolean
}
export interface StorefrontItem {
  id: string
  title: string
  description: string | null
  preview_url: string | null
  price: number
  design_id: string | null
  product_id: string | null
  variant_id: string | null
}
export interface Storefront {
  shop: StorefrontShop
  items: StorefrontItem[]
  closed: boolean
}

// Полезная нагрузка для «в корзину» (RPC shop_item_buy_payload) — всё для сборки CartItem.
export interface ShopBuyPayload {
  shopItemId: string
  shopId: string
  productId: string
  slug: string
  alias: string | null
  title: string
  variantId: string
  colorName: string
  colorHex: string
  size: string
  printMethod: string | null
  spec: unknown
  unitPrice: number
  previewUrl: string | null
}

export const useShops = () => {
  const supabase = useSupabaseClient<Database>()

  // публичная витрина: null если магазин не найден/не активен/скрыт
  async function storefront(slug: string, code?: string): Promise<Storefront | null> {
    const { data, error } = await supabase.rpc('shop_storefront', {
      p_slug: slug,
      p_code: code ?? undefined,
    })
    if (error) throw error
    return (data as unknown as Storefront | null) ?? null
  }

  // админ: создать магазин из заявки. Если владелец ещё не зарегистрирован,
  // возвращает claim_token — админ даёт владельцу ссылку /shop-claim/<token>.
  async function createShop(appId: string, slug: string, name: string, revenueShare: number) {
    const { data, error } = await supabase.rpc('admin_create_shop', {
      p_app_id: appId,
      p_slug: slug,
      p_name: name,
      p_revenue_share: revenueShare,
    })
    if (error) throw error
    return data as unknown as { id: string; slug: string; claim_token: string | null; owner_id: string | null }
  }

  // владелец активирует владение магазином по claim-ссылке (email должен совпасть)
  async function claimShop(token: string): Promise<{ ok: boolean; reason?: string; slug?: string }> {
    const { data, error } = await supabase.rpc('claim_shop', { p_token: token })
    if (error) throw error
    return (data as unknown as { ok: boolean; reason?: string; slug?: string })
  }

  // админ: список магазинов
  async function listShops() {
    const { data, error } = await supabase.rpc('admin_list_shops')
    if (error) throw error
    return data ?? []
  }

  // «в корзину»: собрать позицию из shop_item (product/variant/spec владельца через RPC)
  async function buyPayload(itemId: string, code?: string): Promise<ShopBuyPayload | null> {
    const { data, error } = await supabase.rpc('shop_item_buy_payload', {
      p_item_id: itemId,
      p_code: code ?? undefined,
    })
    if (error) throw error
    return (data as unknown as ShopBuyPayload | null) ?? null
  }

  return { storefront, createShop, claimShop, listShops, buyPayload }
}
