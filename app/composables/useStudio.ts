import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'

// Производственная карточка (§5.2) — только безопасные поля из RPC studio_get_order.
export interface StudioOrderItem {
  id: string
  quantity: number
  print_method: string | null
  designs: {
    id: string
    spec: unknown
    original_url: string | null
    preview_url: string | null
    moderation_status: string
  } | null
  variants: {
    color_name: string
    color_hex: string
    size: string
    sku: string
    products: { title: string } | null
    materials: { name: string; print_method: string; print_mode: string } | null
  } | null
}
export interface StudioOrder {
  id: string
  status: OrderStatus
  created_at: string
  tracking_no: string | null
  carrier: string | null
  shipping_addr: Record<string, unknown> | null
  order_items: StudioOrderItem[]
  order_status_log: { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }[]
}

// Производственный кабинет (§8.3). Очередь оплаченных заказов + Realtime.
export const useStudio = () => {
  const supabase = useSupabaseClient<Database>()

  // Оператор НЕ видит финансы (§5.2). RLS построчный, не поколоночный, поэтому
  // данные заказа отдаёт SECURITY DEFINER RPC только с производственными полями
  // (без total/unit_price/unit_cost). Прямое чтение order_items закрыто до admin (0029).

  /** Очередь: оплаченные заказы, безопасные колонки + счётчик позиций. */
  async function listQueue() {
    const { data, error } = await supabase.rpc('studio_list_queue')
    if (error) throw error
    return data ?? []
  }

  /** Карточка заказа для цеха: позиции, спецификация в мм, заготовка, метод/режим — без денег. */
  async function getOrder(id: string) {
    const { data, error } = await supabase.rpc('studio_get_order', { p_id: id })
    if (error) throw error
    return data as unknown as StudioOrder
  }

  /** Модерация дизайна (P2.14) — серверный эндпоинт со staff-проверкой. */
  async function moderateDesign(designId: string, status: 'approved' | 'rejected') {
    return $fetch(`/api/designs/${designId}/moderation`, { method: 'POST', body: { status } })
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

  return { listQueue, getOrder, changeStatus, moderateDesign, subscribe }
}
