import type { Database, Json } from '~/types/database.types'
import type { CartItem } from '~/composables/useCart'

// Создание заказа из корзины (§9). Делегирует НА СЕРВЕР (/api/orders/create):
// сервер пересчитывает цену по БД и валидирует DPI — клиентскому unit_price
// доверять нельзя (аудит C7/H2). Статус created → pending → (webhook) paid.
export const useOrder = () => {
  const supabase = useSupabaseClient<Database>()
  const cart = useCart()

  interface GiftInput { recipient?: string; message?: string; hidePrice?: boolean }
  async function createFromCart(
    items: CartItem[], shippingAddr: Json, promoCode?: string, gift?: GiftInput, idempotencyKey?: string,
  ): Promise<{ orderId: string; total: number }> {
    const payload = {
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        printMethod: i.printMethod,
        spec: i.spec,
        quantity: i.quantity,
        shopItemId: i.shopItemId ?? undefined,
        shopAccessCode: i.shopAccessCode ?? undefined,
      })),
      shippingAddr,
      promoCode: promoCode || undefined,
      gift: gift && (gift.recipient || gift.message) ? gift : undefined,
      // идемпотентность: ретрай/двойной сабмит с тем же ключом не создаст дубль заказа
      idempotencyKey: idempotencyKey || undefined,
    }
    return await $fetch<{ orderId: string; total: number }>('/api/orders/create', {
      method: 'POST',
      body: payload,
    })
  }

  /** Повтор заказа (CRM §3.2): позиции из старого заказа → в корзину.
   *  Снятые с продажи и распроданные варианты пропускаем (иначе ошибка на checkout). */
  async function reorder(orderId: string): Promise<{ added: number; skipped: number }> {
    const { data, error } = await supabase
      .from('order_items')
      .select(`quantity, unit_price, print_method,
        designs(spec),
        variants(id, color_name, color_hex, size, stock, products(id, title, slug, alias, is_active))`)
      .eq('order_id', orderId)
    if (error) throw error
    let added = 0
    let skipped = 0
    cart.load()
    for (const it of data ?? []) {
      const v = it.variants
      const p = v?.products
      if (!v || !p || !p.is_active || v.stock <= 0) { skipped++; continue }
      cart.add({
        productId: p.id,
        slug: p.slug,
        alias: p.alias ?? null,
        title: p.title,
        variantId: v.id,
        colorName: v.color_name,
        colorHex: v.color_hex,
        size: v.size,
        printMethod: it.print_method,
        spec: (it.designs?.spec ?? {}) as Json,
        unitPrice: Number(it.unit_price) || 0,
        quantity: it.quantity,
      })
      added++
    }
    return { added, skipped }
  }

  return { createFromCart, reorder }
}
