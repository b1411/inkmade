import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Интеграционные RLS-тесты (аудит безопасности). Проверяют политики ЧЕРЕЗ реальный
// PostgREST + JWT ОБЫЧНОГО пользователя — ровно то, что может сделать вошедший атакующий
// напрямую через REST, минуя наши server/api. Структурные проверки (политика существует)
// недостаточны — здесь поведенческая регрессия ловится автоматически на каждом прогоне.
//
// Гейт: запускаются только при наличии Supabase-секретов и тест-аккаунта (CI job
// rls-security, те же секреты что и e2e). Без них — describe.skip, юнит-CI не краснеет.
// Не деструктивны: единственная мутация — временный ключ platform_settings, удаляется в finally.

const URL = process.env.NUXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.E2E_CUSTOMER_EMAIL
const PASSWORD = process.env.E2E_CUSTOMER_PASSWORD
const ready = !!(URL && ANON && SERVICE && EMAIL && PASSWORD)

const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const

describe.runIf(ready)('RLS security policies (integration)', () => {
  let user: SupabaseClient
  let service: SupabaseClient
  let uid: string

  beforeAll(async () => {
    user = createClient(URL!, ANON!, opts)
    service = createClient(URL!, SERVICE!, opts)
    const { data, error } = await user.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! })
    if (error || !data.user) throw new Error(`Не удалось войти тест-аккаунтом: ${error?.message}`)
    uid = data.user.id

    // тест-аккаунт должен быть рядовым пользователем, иначе проверки эскалации бессмысленны
    const { data: me } = await service.from('profiles').select('role').eq('id', uid).single()
    if (me && (me.role === 'admin' || me.role === 'operator')) {
      throw new Error(`Тест-аккаунт имеет привилегированную роль '${me.role}' — нужен обычный customer`)
    }
  })

  afterAll(async () => {
    await user?.auth.signOut()
  })

  // ── #5 (MEDIUM): утечка payout_details через публичную витрину ──
  it('не читает payout_details чужих дизайнеров напрямую', async () => {
    const { data, error } = await user
      .from('designer_profiles')
      .select('id, payout_details, tax_status')
      .neq('id', uid)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('публичная витрина доступна через RPC и НЕ отдаёт приватные колонки', async () => {
    const { data: pub } = await service
      .from('designer_profiles').select('id').eq('is_public', true).limit(1)
    const designerId = pub?.[0]?.id
    if (!designerId) return // нет публичных дизайнеров в этой БД — нечего проверять
    const { data, error } = await user.rpc('public_designer_profile', { p_id: designerId })
    expect(error).toBeNull()
    const rows = (data ?? []) as Record<string, unknown>[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).not.toHaveProperty('payout_details')
      expect(row).not.toHaveProperty('tax_status')
      expect(row).not.toHaveProperty('royalty_pct')
    }
  })

  // ── эскалация роли (profiles) ──
  it('не может повысить себе роль до admin', async () => {
    const { error } = await user.from('profiles').update({ role: 'admin' }).eq('id', uid)
    expect(error).not.toBeNull() // WITH CHECK (role = user_role()) отклоняет смену роли
    const { data } = await service.from('profiles').select('role').eq('id', uid).single()
    expect(data?.role).not.toBe('admin')
  })

  // ── утечка чужих/денежных данных ──
  it('не читает чужие денежные/служебные таблицы', async () => {
    for (const t of ['payments', 'promo_codes', 'finance_entries', 'admin_audit_log'] as const) {
      const { data } = await user.from(t).select('*').limit(1)
      expect(data ?? [], `таблица ${t} не должна быть видна обычному пользователю`).toHaveLength(0)
    }
  })

  // ── прямые привилегированные записи (обход server/api) ──
  it('не может писать напрямую в orders / ai_generations / promo_codes', async () => {
    const orders = await user.from('orders')
      .insert({ user_id: uid, status: 'paid', total: 1 } as never)
    expect(orders.error, 'прямой insert в orders должен быть отклонён').not.toBeNull()

    const ai = await user.from('ai_generations')
      .insert({ user_id: uid, prompt: 'rls-test', status: 'completed' } as never)
    expect(ai.error, 'прямой insert в ai_generations должен быть отклонён').not.toBeNull()

    const promo = await user.from('promo_codes')
      .insert({ code: 'RLSHACK', discount_type: 'percent', discount_value: 99 } as never)
    expect(promo.error, 'прямой insert в promo_codes должен быть отклонён').not.toBeNull()
  })

  // ── #7 (MEDIUM): приватные ключи platform_settings ──
  it('не видит приватный ключ platform_settings', async () => {
    const key = `__rls_test_${uid.slice(0, 8)}`
    await service.from('platform_settings').delete().eq('key', key) // на случай висящего ключа
    await service.from('platform_settings')
      .insert({ key, value: { secret: true } as never, is_public: false })
    try {
      const { data } = await user.from('platform_settings').select('key, value').eq('key', key)
      expect(data ?? []).toHaveLength(0)
    } finally {
      await service.from('platform_settings').delete().eq('key', key)
    }
  })
})
