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
  internal_notes: string | null
  is_gift: boolean
  gift_recipient: string | null
  gift_message: string | null
  gift_hide_price: boolean
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

  /**
   * Внутренние заметки цеха. Прямой UPDATE под политикой orders_staff_update —
   * internal_notes НЕ денежное поле, поэтому guard_orders_update (0057) пропускает.
   */
  async function setInternalNotes(orderId: string, notes: string) {
    const { error } = await supabase
      .from('orders')
      .update({ internal_notes: notes.trim() || null })
      .eq('id', orderId)
    if (error) throw error
  }

  /** Подписка на изменения заказов (Realtime, §8.3) — новый заказ виден мгновенно. */
  function subscribe(onChange: () => void) {
    const channel = supabase
      .channel('studio-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  // ── Доказательная база возвратов (§6.8): фото QC/брака в приватном бакете ──
  /** Загрузить фото-доказательство к заказу. Файл уходит в приватный бакет evidence. */
  async function addEvidence(orderId: string, file: File, kind: 'qc' | 'defect' | 'other', note?: string) {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${orderId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const { error: upErr } = await supabase.storage.from('evidence').upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('order_evidence')
      .insert({ order_id: orderId, path, kind, note: note ?? null, actor_id: user?.id ?? null })
    if (error) throw error
  }

  /** Список доказательств заказа со временными подписанными ссылками (приватный бакет). */
  async function listEvidence(orderId: string) {
    const { data, error } = await supabase
      .from('order_evidence')
      .select('id, path, kind, note, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data ?? []
    const signed = await Promise.all(rows.map(async (r) => {
      const { data: s } = await supabase.storage.from('evidence').createSignedUrl(r.path, 3600)
      return { ...r, url: s?.signedUrl ?? null }
    }))
    return signed
  }

  return { listQueue, getOrder, changeStatus, setInternalNotes, moderateDesign, subscribe, addEvidence, listEvidence }
}
