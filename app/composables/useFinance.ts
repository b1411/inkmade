import type { Database } from '~/types/database.types'

// Финансы и управление дизайнерами в админ-CRM (CRM §6.2, §6.3). admin-only RLS.
export const useFinance = () => {
  const supabase = useSupabaseClient<Database>()

  async function stats(from?: string, to?: string) {
    const { data, error } = await supabase.rpc('admin_finance_stats', { p_from: from ?? undefined, p_to: to ?? undefined })
    if (error) throw error
    return data as Record<string, number>
  }

  // динамика по дням (для графика, §6.1)
  async function series(from?: string, to?: string) {
    const { data, error } = await supabase.rpc('admin_finance_series', { p_from: from ?? undefined, p_to: to ?? undefined })
    if (error) throw error
    return (data ?? []) as { day: string; revenue: number; profit: number }[]
  }

  // маржа по изделиям и методам (§6.2)
  async function marginBreakdown() {
    const { data, error } = await supabase.rpc('admin_margin_breakdown')
    if (error) throw error
    return (data ?? { by_product: [], by_method: [] }) as {
      by_product: { title: string; qty: number; revenue: number; cost: number; margin: number }[]
      by_method: { method: string; qty: number; revenue: number; cost: number; margin: number }[]
    }
  }

  async function entries(limit = 200) {
    const { data, error } = await supabase
      .from('finance_entries')
      .select('id, entry_type, amount, currency, note, created_at, order_id')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }

  // ── Дизайнеры ──────────────────────────────────────────────
  interface DesignerRow {
    id: string
    display_name: string | null
    royalty_pct: number
    status: string
    tax_status: string
    is_public: boolean
    total_earned: number
    total_paid: number
    available: number
  }
  async function designers(): Promise<DesignerRow[]> {
    const { data: profiles } = await supabase.from('designer_profiles').select('*').order('created_at', { ascending: false })
    const { data: balances } = await supabase.from('designer_balances').select('*')
    const bMap = new Map((balances ?? []).map(b => [b.designer_id, b]))
    return (profiles ?? []).map((p) => {
      const b = bMap.get(p.id)
      return {
        id: p.id, display_name: p.display_name, royalty_pct: p.royalty_pct, status: p.status,
        tax_status: p.tax_status, is_public: p.is_public,
        total_earned: Number(b?.total_earned ?? 0), total_paid: Number(b?.total_paid ?? 0), available: Number(b?.available ?? 0),
      }
    })
  }

  async function balanceOf(designerId: string) {
    const { data } = await supabase.from('designer_balances').select('*').eq('designer_id', designerId).maybeSingle()
    return data
  }

  async function earningsOf(designerId: string) {
    const { data } = await supabase
      .from('royalty_earnings')
      .select('id, amount, sale_base, rate_pct, status, created_at, print_library(title)')
      .eq('designer_id', designerId)
      .order('created_at', { ascending: false })
    return data ?? []
  }

  async function printsOf(designerId: string) {
    const { data } = await supabase.from('print_library').select('*').eq('owner_id', designerId)
    return data ?? []
  }

  async function setRate(designerId: string, pct: number) {
    const { error } = await supabase.rpc('set_royalty_rate', { p_designer_id: designerId, p_new_pct: pct })
    if (error) throw error
  }

  async function rateHistoryOf(designerId: string) {
    const { data } = await supabase.from('royalty_rate_history').select('*').eq('designer_id', designerId).order('changed_at', { ascending: false })
    return data ?? []
  }

  // ── Модерация принтов ──────────────────────────────────────
  async function moderationQueue() {
    const { data } = await supabase
      .from('print_library')
      .select('*')
      .eq('moderation_status', 'pending')
      .order('id', { ascending: false })
    return data ?? []
  }

  async function moderatePrint(id: string, status: 'approved' | 'rejected', note?: string) {
    const { error } = await supabase.from('print_library').update({ moderation_status: status, moderation_note: note ?? null }).eq('id', id)
    if (error) throw error
  }

  // ── Выплаты ────────────────────────────────────────────────
  async function payouts(status?: string) {
    let q = supabase.from('payouts').select('*').order('requested_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data } = await q
    return data ?? []
  }

  async function markPaid(payoutId: string) {
    const { error } = await supabase.rpc('mark_payout_paid', { p_payout_id: payoutId })
    if (error) throw error
  }

  /** Возврат заказа: статус refunded + реверс начисленных роялти + леджер (§7.3). */
  async function refundOrder(orderId: string, note?: string) {
    return await $fetch('/api/admin/orders/refund', {
      method: 'POST',
      body: { orderId, note },
    })
  }

  async function auditLog(limit = 200) {
    const { data } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
    return data ?? []
  }

  // ── Приглашения дизайнеров (закрытый старт §7.5) ───────────
  async function invitations() {
    const { data } = await supabase.from('designer_invitations').select('*').order('created_at', { ascending: false })
    return data ?? []
  }

  async function createInvite(email: string, royaltyPct: number, note?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('designer_invitations')
      .insert({ email, royalty_pct: royaltyPct, note: note ?? null, invited_by: user?.id ?? null })
      .select().single()
    if (error) throw error
    return data
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from('designer_invitations').update({ status: 'revoked' }).eq('id', id)
    if (error) throw error
  }

  return {
    stats, series, marginBreakdown, entries, designers, balanceOf, earningsOf, printsOf, setRate, rateHistoryOf,
    moderationQueue, moderatePrint, payouts, markPaid, refundOrder, auditLog,
    invitations, createInvite, revokeInvite,
  }
}
