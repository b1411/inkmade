// Сид главных аккаунтов INKMADE (одноразовый). Запуск:
//   node --env-file=.env scripts/seed-accounts.mjs
// Создаёт manager(operator), designer(designer+профиль), customer(customer) с моковыми
// данными: адреса, избранное, заказы в разных статусах (через apply_paid + change_order_status,
// чтобы наполнились finance_entries и работал клиентский трекинг). admin уже существует.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://jpxiuyinqhokzzcqbggf.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) { console.error('Нет SUPABASE_SERVICE_ROLE_KEY в .env'); process.exit(1) }
const sb = createClient(url, key, { auth: { persistSession: false } })

const PASSWORD = 'Inkmade2026!'

async function getOrCreateUser(email, fullName) {
  // ищем среди существующих
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = list?.users?.find(u => u.email === email)
  if (existing) return existing.id
  const { data, error } = await sb.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName },
  })
  if (error) throw new Error(`${email}: ${error.message}`)
  return data.user.id
}

async function setRole(userId, role) {
  await sb.from('profiles').update({ role, full_name: undefined }).eq('id', userId)
  await sb.from('profiles').update({ role }).eq('id', userId)
}

function advanceChain(target) {
  const full = ['queued', 'printing', 'quality_check', 'packing', 'ready_to_ship', 'shipped', 'delivered']
  const idx = full.indexOf(target)
  return idx === -1 ? [] : full.slice(0, idx + 1)
}

async function seedOrder(customerId, operatorId, product, variant, { target, unitPrice, unitCost }) {
  const { data: order, error: oe } = await sb.from('orders')
    .insert({ user_id: customerId, status: 'created', total: unitPrice, shipping_addr: { full_name: 'Тест Клиент', phone: '+7 700 123 45 67', city: 'Алматы', address: 'ул. Абая 10', email: 'customer@inkmade.kz' } })
    .select('id').single()
  if (oe) throw new Error('order: ' + oe.message)

  const { data: design, error: de } = await sb.from('designs')
    .insert({
      user_id: customerId, product_id: product.id, variant_id: variant.id, moderation_status: 'approved',
      spec: { placements: [{ zone: 'chest', width_mm: 200, height_mm: 250, natural_w: 2400, natural_h: 3000, source: 'upload', x_mm: 0, y_mm: 0, rotation_deg: 0 }], print_mode: 'zonal' },
    })
    .select('id').single()
  if (de) throw new Error('design: ' + de.message)

  const { error: ie } = await sb.from('order_items').insert({
    order_id: order.id, design_id: design.id, variant_id: variant.id,
    print_method: 'dtg', quantity: 1, unit_price: unitPrice, unit_cost: unitCost,
  })
  if (ie) throw new Error('item: ' + ie.message)

  // оплата → paid + finance (revenue/cogs)
  const { error: pe } = await sb.rpc('apply_paid', { p_order_id: order.id, p_provider_txn: 'seed_' + order.id, p_raw: {} })
  if (pe) throw new Error('apply_paid: ' + pe.message)

  // продвижение по этапам
  for (const to of advanceChain(target)) {
    const { error: ce } = await sb.rpc('change_order_status', {
      p_order_id: order.id, p_to: to, p_actor: operatorId, p_note: 'сид',
      p_tracking: to === 'shipped' ? 'KZ' + order.id.slice(0, 8).toUpperCase() : '',
      p_carrier: to === 'shipped' ? 'Kazpost' : '',
    })
    if (ce) throw new Error(`status ${to}: ` + ce.message)
  }
  return order.id
}

async function run() {
  // 1) аккаунты
  const operatorId = await getOrCreateUser('manager@inkmade.kz', 'Менеджер INKMADE')
  await setRole(operatorId, 'operator')
  console.log('✓ manager@inkmade.kz (operator)')

  const designerId = await getOrCreateUser('designer@inkmade.kz', 'Дизайнер INKMADE')
  await setRole(designerId, 'designer')
  await sb.from('designer_profiles').upsert({
    id: designerId, display_name: 'INK Artist', bio: 'Стрит-графика и леттеринг.',
    royalty_pct: 15, tax_status: 'self_employed', is_public: true, status: 'active',
  }, { onConflict: 'id' })
  console.log('✓ designer@inkmade.kz (designer, профиль, ставка 15%)')

  const customerId = await getOrCreateUser('customer@inkmade.kz', 'Тест Клиент')
  await setRole(customerId, 'customer')
  console.log('✓ customer@inkmade.kz (customer)')

  // 2) адреса клиента
  await sb.from('addresses').delete().eq('user_id', customerId)
  await sb.from('addresses').insert([
    { user_id: customerId, full_name: 'Тест Клиент', phone: '+7 700 123 45 67', city: 'Алматы', address: 'ул. Абая 10, кв. 5', is_default: true },
    { user_id: customerId, full_name: 'Тест Клиент', phone: '+7 700 123 45 67', city: 'Астана', address: 'пр. Туран 5, офис 3', is_default: false },
  ])

  // 3) избранное (товары)
  const { data: products } = await sb.from('products')
    .select('id, title, variants(id, stock, material_id, color_name, color_hex, size)')
    .eq('is_active', true).limit(5)
  const active = (products ?? []).filter(p => (p.variants ?? []).some(v => v.stock > 0))
  await sb.from('favorites').delete().eq('user_id', customerId)
  for (const p of active.slice(0, 2)) {
    await sb.from('favorites').insert({ user_id: customerId, product_id: p.id })
  }

  // 4) заказы в разных статусах
  const prod = active[0]
  const variant = prod?.variants?.find(v => v.stock > 0)
  if (!prod || !variant) { console.log('Нет активного товара со стоком — заказы не созданы'); return }

  const targets = [
    { target: 'queued', unitPrice: 6490, unitCost: 1600 },
    { target: 'printing', unitPrice: 7990, unitCost: 1800 },
    { target: 'shipped', unitPrice: 5490, unitCost: 1400 },
    { target: 'delivered', unitPrice: 9990, unitCost: 2200 },
  ]
  for (const t of targets) {
    const id = await seedOrder(customerId, operatorId, prod, variant, t)
    console.log(`✓ заказ ${id.slice(0, 8)} → ${t.target}`)
  }

  console.log('\nГотово. Доступы (пароль у всех одинаковый):')
  console.log('  admin@inkmade.kz      — админ (уже был)')
  console.log('  manager@inkmade.kz    — оператор (производство)')
  console.log('  designer@inkmade.kz   — дизайнер')
  console.log('  customer@inkmade.kz   — клиент')
  console.log(`  Пароль: ${PASSWORD}`)
}

run().catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1) })
