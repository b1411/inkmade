import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sql = readFileSync(
  fileURLToPath(new URL('../supabase/migrations/0092_studio_queue_stage_sla.sql', import.meta.url)),
  'utf8',
)

describe('studio queue stage SLA migration', () => {
  it('returns the current stage entry time', () => {
    expect(sql).toContain('status_changed_at timestamptz')
    expect(sql).toContain('l.to_status = o.status')
    expect(sql).toContain('select max(l.created_at)')
  })

  it('falls back safely for legacy orders', () => {
    expect(sql).toContain('o.paid_at')
    expect(sql).toContain('o.created_at')
  })

  it('does not expose financial order fields', () => {
    expect(sql).not.toMatch(/\btotal\b/)
    expect(sql).not.toMatch(/\bunit_price\b/)
    expect(sql).not.toMatch(/\bunit_cost\b/)
  })

  it('keeps execution limited to authenticated users with a staff guard', () => {
    expect(sql).toContain('where private.is_staff()')
    expect(sql).toContain('revoke all on function public.studio_list_queue() from public, anon')
    expect(sql).toContain('grant execute on function public.studio_list_queue() to authenticated')
  })
})
