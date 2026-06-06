import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { isValidTransition, REASON_REQUIRED } from '~~/shared/config/order-status'

// Серверная смена статуса (§8.5): проверка роли, валидация перехода по автомату (§5.3),
// запись orders.status + order_status_log. Недопустимые переходы невозможны.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const orderId = getRouterParam(event, 'id')!
  const body = await readBody<{ to: OrderStatus; note?: string; trackingNo?: string; carrier?: string }>(event)
  const to = body.to

  const svc = serverSupabaseServiceRole<Database>(event)

  // роль (operator/admin) — staff
  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Только производство/админ' })
  }

  const { data: order, error } = await svc.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })

  const from = order.status as OrderStatus
  if (!isValidTransition(from, to)) {
    throw createError({ statusCode: 400, statusMessage: `Недопустимый переход ${from} → ${to}` })
  }
  if (REASON_REQUIRED.includes(to) && !body.note?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Для этого перехода нужна причина' })
  }
  if (to === 'shipped' && (!body.trackingNo || !body.carrier)) {
    throw createError({ statusCode: 400, statusMessage: 'Нужны трек-номер и перевозчик' })
  }

  // обновление заказа
  const patch: Database['public']['Tables']['orders']['Update'] = { status: to }
  if (to === 'shipped') {
    patch.tracking_no = body.trackingNo
    patch.carrier = body.carrier
    patch.shipped_at = new Date().toISOString()
  }
  await svc.from('orders').update(patch).eq('id', orderId)

  // лог перехода (актор = оператор)
  await svc.from('order_status_log').insert({
    order_id: orderId, from_status: from, to_status: to, actor_id: user.id, note: body.note ?? null,
  })

  // складские эффекты
  const { data: items } = await svc.from('order_items').select('variant_id, quantity').eq('order_id', orderId)
  if (to === 'reprint') {
    // брак: заготовка испорчена (§8.3, §8.4 процесс 3)
    for (const it of items ?? []) {
      if (!it.variant_id) continue
      await svc.from('stock_movements').insert({
        variant_id: it.variant_id, delta: -it.quantity, reason: 'defect', order_id: orderId, actor_id: user.id,
      })
      const { data: v } = await svc.from('variants').select('stock').eq('id', it.variant_id).single()
      if (v) await svc.from('variants').update({ stock: Math.max(0, v.stock - it.quantity) }).eq('id', it.variant_id)
    }
  }
  if (to === 'cancelled' && order.paid_at && (from === 'paid' || from === 'queued')) {
    // возврат заготовки при отмене до печати (§8.4 процесс 5)
    for (const it of items ?? []) {
      if (!it.variant_id) continue
      await svc.from('stock_movements').insert({
        variant_id: it.variant_id, delta: it.quantity, reason: 'correction', order_id: orderId, actor_id: user.id,
      })
      const { data: v } = await svc.from('variants').select('stock').eq('id', it.variant_id).single()
      if (v) await svc.from('variants').update({ stock: v.stock + it.quantity }).eq('id', it.variant_id)
    }
  }

  return { ok: true, from, to }
})
