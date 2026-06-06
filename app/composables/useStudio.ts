import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'

// Производственный кабинет (§8.3). Очередь оплаченных заказов + Realtime.
export const useStudio = () => {
  const supabase = useSupabaseClient<Database>()

  /** Очередь: оплаченные заказы (RLS staff отдаёт paid+). */
  async function listQueue() {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at, tracking_no, carrier, order_items(id)')
      .not('paid_at', 'is', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  }

  /** Карточка заказа для цеха: позиции, спецификация в мм, заготовка, метод/режим. */
  async function getOrder(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`*,
        order_items(*,
          designs(spec, original_url, preview_url),
          variants(color_name, color_hex, size, sku, products(title), materials(name, print_method, print_mode))
        ),
        order_status_log(*)`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  /** Смена статуса через серверный эндпоинт (валидация автомата §8.5). */
  async function changeStatus(orderId: string, to: OrderStatus, opts?: { note?: string; trackingNo?: string; carrier?: string }) {
    return $fetch(`/api/orders/${orderId}/status`, { method: 'POST', body: { to, ...opts } })
  }

  /** Подписка на изменения заказов (Realtime, §8.3) — новый заказ виден мгновенно. */
  function subscribe(onChange: () => void) {
    const channel = supabase
      .channel('studio-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  return { listQueue, getOrder, changeStatus, subscribe }
}
