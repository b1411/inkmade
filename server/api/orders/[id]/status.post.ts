import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { isValidTransition, REASON_REQUIRED } from '~~/shared/config/order-status'
import { notifyOrder } from '~~/server/utils/email'
import { requireUuid } from '~~/server/utils/validation'
import { orderStatusSchema, parseOrThrow } from '~~/server/utils/schemas'

// Серверная смена статуса (§8.5): проверка роли, валидация перехода по автомату (§5.3),
// запись orders.status + order_status_log. Недопустимые переходы невозможны.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const orderId = requireUuid(getRouterParam(event, 'id'), 'идентификатор заказа')
  const body = parseOrThrow(orderStatusSchema, await readBody(event))
  const to = body.to as OrderStatus

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

  // Гейт модерации (P2.14, §24): в печать — только если все дизайны заказа одобрены.
  if (to === 'printing') {
    const { data: rows } = await svc
      .from('order_items')
      .select('designs(moderation_status)')
      .eq('order_id', orderId)
    const blocked = (rows ?? []).some((r) => {
      const d = r.designs as { moderation_status?: string } | null
      return d?.moderation_status !== 'approved'
    })
    if (blocked) {
      throw createError({ statusCode: 400, statusMessage: 'Нельзя в печать: есть непромодерированные дизайны' })
    }
  }

  // атомарная запись статуса + лога + складских эффектов (аудит C6/H4):
  // одна транзакция + advisory lock; возврат заготовки только если заказ не доходил до printing.
  const { error: rpcErr } = await svc.rpc('change_order_status', {
    p_order_id: orderId,
    p_to: to,
    p_actor: user.id,
    p_note: body.note ?? '',
    p_tracking: body.trackingNo ?? '',
    p_carrier: body.carrier ?? '',
  })
  if (rpcErr) {
    console.error('[order-status] change_order_status failed:', rpcErr.message)
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сменить статус заказа' })
  }

  // уведомления клиенту на ключевых статусах (P1.7), best-effort
  if (to === 'shipped') await notifyOrder(svc, orderId, 'shipped', { trackingNo: body.trackingNo, carrier: body.carrier })
  else if (to === 'delivered') await notifyOrder(svc, orderId, 'delivered')

  return { ok: true, from, to }
})
