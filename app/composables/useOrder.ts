import type { Database, Json } from '~/types/database.types'
import type { CartItem } from '~/composables/useCart'

// Создание заказа из корзины (§9). Пишет под RLS пользователя:
// designs/orders/order_items owner-политики. Статус created → pending → (webhook) paid.
export const useOrder = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function createFromCart(items: CartItem[], shippingAddr: Json) {
    if (!user.value) throw new Error('Требуется вход')
    const uid = user.value.id

    // 1) дизайны (по одному — сохраняем соответствие позициям)
    const designIds: string[] = []
    for (const i of items) {
      const { data, error } = await supabase
        .from('designs')
        .insert({ user_id: uid, product_id: i.productId, variant_id: i.variantId, spec: i.spec })
        .select('id')
        .single()
      if (error) throw error
      designIds.push(data.id)
    }

    // 2) заказ (created)
    const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({ user_id: uid, status: 'created', total, shipping_addr: shippingAddr })
      .select()
      .single()
    if (oErr) throw oErr

    // 3) позиции
    const itemRows = items.map((i, idx) => ({
      order_id: order.id,
      design_id: designIds[idx],
      variant_id: i.variantId,
      print_method: i.printMethod,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }))
    const { error: iErr } = await supabase.from('order_items').insert(itemRows)
    if (iErr) throw iErr

    return order
  }

  return { createFromCart }
}
