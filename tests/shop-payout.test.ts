import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sql = readFileSync(
  fileURLToPath(new URL('../supabase/migrations/0091_shop_payouts.sql', import.meta.url)),
  'utf8',
)

describe('shop payout migration invariants', () => {
  it('создаёт RLS-контур только для владельца и администратора', () => {
    expect(sql).toContain('alter table public.shop_payouts enable row level security')
    expect(sql).toContain('s.owner_id = (select auth.uid()) or private.is_admin()')
  })

  it('сервер определяет сумму и блокирует параллельные заявки', () => {
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('shop-payout:")
    expect(sql).toContain("status = 'requested'")
    expect(sql).toContain('values (p_shop_id, v_available')
  })

  it('проверяет реквизиты и соответствие зарезервированных начислений', () => {
    expect(sql).toContain("p_details ->> 'account'")
    expect(sql).toContain('abs(v_reserved - v_available) > 0.01')
    expect(sql).toContain('abs(v_reserved - v_p.amount) > 0.01')
  })

  it('не открывает definer-функции анонимам', () => {
    expect(sql).toContain('revoke all on function public.request_shop_payout')
    expect(sql).toContain('revoke all on function public.process_shop_payout')
    expect(sql).toContain('grant execute on function public.request_shop_payout')
  })
})
