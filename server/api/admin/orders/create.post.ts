import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'
import { isUuid, isFiniteNonNeg } from '~~/server/utils/validation'

// Ручной заказ администратором (телефон/офлайн) — §8.2.3.
// Только admin. Заказ создаётся в статусе 'created' (неоплачен) и далее ведётся по
// обычному автомату статусов. Цена берётся из тела (админ выставляет вручную), но
// валидируется как конечное неотрицательное число; total пересчитывается на сервере.
// Позиции без дизайна (design_id = null) — допустимо схемой (order_items.design_id nullable).

interface LineInput { variantId?: string; quantity?: number; unitPrice?: number }

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ userId?: string; items?: LineInput[]; note?: string }>(event)

  const svc = serverSupabaseServiceRole<Database>(event)

  const { data: me } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Только админ' })

  // клиент заказа
  const customerId = body.userId
  if (!isUuid(customerId)) throw createError({ statusCode: 400, statusMessage: 'Выберите клиента' })
  const { data: customer } = await svc.from('profiles').select('id').eq('id', customerId).single()
  if (!customer) throw createError({ statusCode: 404, statusMessage: 'Клиент не найден' })

  // позиции
  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Добавьте хотя бы одну позицию' })

  const variantIds = items.map(i => i.variantId)
  if (!variantIds.every(isUuid)) throw createError({ statusCode: 400, statusMessage: 'Некорректный вариант в позиции' })

  const { data: variants } = await svc.from('variants')
    .select('id, blank_cost, stock, product_id, products(is_active)')
    .in('id', variantIds as string[])
  const vMap = new Map((variants ?? []).map(v => [v.id, v]))

  interface Priced { variantId: string; quantity: number; unitPrice: number; unitCost: number }
  const priced: Priced[] = []
  const need = new Map<string, number>() // суммарная потребность по варианту (позиции могут повторяться)
  for (const it of items) {
    const v = vMap.get(it.variantId as string)
    if (!v) throw createError({ statusCode: 400, statusMessage: 'Вариант не найден' })
    // товар снят с продажи — ручной заказ по нему не создаём (раньше is_active было мёртвым кодом)
    const prod = v.products as { is_active?: boolean } | { is_active?: boolean }[] | null
    const isActive = Array.isArray(prod) ? prod[0]?.is_active : prod?.is_active
    if (isActive === false) throw createError({ statusCode: 409, statusMessage: 'Товар снят с продажи' })
    const qty = Math.round(Number(it.quantity) || 0)
    if (!Number.isInteger(qty) || qty < 1) throw createError({ statusCode: 400, statusMessage: 'Некорректное количество' })
    if (!isFiniteNonNeg(it.unitPrice, 100_000_000)) throw createError({ statusCode: 400, statusMessage: 'Некорректная цена позиции' })
    need.set(v.id, (need.get(v.id) ?? 0) + qty)
    priced.push({ variantId: v.id, quantity: qty, unitPrice: it.unitPrice as number, unitCost: Number(v.blank_cost) || 0 })
  }

  // предпроверка остатка (дружелюбная): не создаём заказ, который нельзя выполнить.
  // Авторитетное списание — при оплате в apply_paid (row-lock); здесь только ранний отказ.
  for (const [variantId, qtyNeeded] of need) {
    if (Number(vMap.get(variantId)?.stock ?? 0) < qtyNeeded) {
      throw createError({ statusCode: 409, statusMessage: 'Недостаточно на складе' })
    }
  }

  const total = priced.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

  // адрес/контакт минимальный: помечаем источник как ручной заказ оператора
  const shippingAddr = { source: 'admin_manual', note } as unknown as Json

  const { data: order, error: oErr } = await svc.from('orders')
    .insert({ user_id: customerId, status: 'created', total, shipping_addr: shippingAddr })
    .select('id').single()
  if (oErr || !order) throw createError({ statusCode: 500, statusMessage: 'Не удалось создать заказ' })

  const rows = priced.map(p => ({
    order_id: order.id,
    design_id: null,
    variant_id: p.variantId,
    quantity: p.quantity,
    unit_price: p.unitPrice,
    unit_cost: p.unitCost,
  }))
  const { error: iErr } = await svc.from('order_items').insert(rows)
  if (iErr) {
    await svc.from('orders').delete().eq('id', order.id) // откат, чтобы не плодить пустые заказы
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить позиции' })
  }

  return { orderId: order.id, total }
})
