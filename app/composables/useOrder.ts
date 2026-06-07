import type { Json } from '~/types/database.types'
import type { CartItem } from '~/composables/useCart'

// Создание заказа из корзины (§9). Делегирует НА СЕРВЕР (/api/orders/create):
// сервер пересчитывает цену по БД и валидирует DPI — клиентскому unit_price
// доверять нельзя (аудит C7/H2). Статус created → pending → (webhook) paid.
export const useOrder = () => {
  async function createFromCart(items: CartItem[], shippingAddr: Json): Promise<{ orderId: string; total: number }> {
    const payload = {
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        printMethod: i.printMethod,
        spec: i.spec,
        quantity: i.quantity,
      })),
      shippingAddr,
    }
    return await $fetch<{ orderId: string; total: number }>('/api/orders/create', {
      method: 'POST',
      body: payload,
    })
  }

  return { createFromCart }
}
