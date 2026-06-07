import type { Database, TablesInsert } from '~/types/database.types'

// Кабинет дизайнера (CRM §4): профиль, баланс, начисления, мои принты, выплаты.
export const useDesigner = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function profile() {
    const { data } = await supabase.from('designer_profiles').select('*').eq('id', user.value!.id).maybeSingle()
    return data
  }

  async function balance() {
    const { data } = await supabase.from('designer_balances').select('*').eq('designer_id', user.value!.id).maybeSingle()
    return data ?? { designer_id: user.value!.id, total_earned: 0, total_paid: 0, available: 0, updated_at: '' }
  }

  async function earnings(limit = 100) {
    const { data, error } = await supabase
      .from('royalty_earnings')
      .select('id, amount, sale_base, rate_pct, status, created_at, print_library(title), orders(status)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }

  /** Сводка по принтам дизайнера: продажи и роялти по каждому. */
  async function myPrints() {
    const { data, error } = await supabase
      .from('print_library')
      .select('*')
      .eq('owner_id', user.value!.id)
      .order('id', { ascending: false })
    if (error) throw error
    return data
  }

  /** Статистика продаж/роялти по каждому принту (print_id → {sales, royalty}). */
  async function printStats(): Promise<Record<string, { sales: number; royalty: number }>> {
    const { data } = await supabase
      .from('royalty_earnings')
      .select('print_id, amount, status')
      .eq('designer_id', user.value!.id)
    const map: Record<string, { sales: number; royalty: number }> = {}
    for (const e of data ?? []) {
      if (!e.print_id || e.status === 'reversed') continue
      const m = (map[e.print_id] ??= { sales: 0, royalty: 0 })
      m.sales += 1
      m.royalty += Number(e.amount) || 0
    }
    return map
  }

  async function uploadPrintFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png'
    const path = `library/${user.value!.id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const { error } = await supabase.storage.from('design-uploads').upload(path, file, { upsert: false })
    if (error) throw error
    return supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
  }

  async function createPrint(payload: { title: string; file_url: string; thumbnail_url?: string | null; tags?: string[] }) {
    const row: TablesInsert<'print_library'> = {
      title: payload.title,
      file_url: payload.file_url,
      thumbnail_url: payload.thumbnail_url ?? payload.file_url,
      tags: payload.tags ?? [],
      owner_id: user.value!.id,
      is_active: true,
      moderation_status: 'pending', // гард всё равно принудит pending для не-админа
    }
    const { data, error } = await supabase.from('print_library').insert(row).select().single()
    if (error) throw error
    return data
  }

  async function updatePrint(id: string, patch: Partial<TablesInsert<'print_library'>>) {
    const { error } = await supabase.from('print_library').update(patch).eq('id', id)
    if (error) throw error
  }

  async function removePrint(id: string) {
    const { error } = await supabase.from('print_library').delete().eq('id', id)
    if (error) throw error
  }

  async function payouts() {
    const { data, error } = await supabase.from('payouts').select('*').order('requested_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function requestPayout(amount: number, method?: string, details?: Record<string, unknown>) {
    const { error } = await supabase.rpc('request_payout', {
      p_amount: amount, p_method: method ?? undefined, p_details: (details ?? undefined) as never,
    })
    if (error) throw error
  }

  async function updateProfile(patch: Partial<TablesInsert<'designer_profiles'>>) {
    const { error } = await supabase.from('designer_profiles').update(patch).eq('id', user.value!.id)
    if (error) throw error
  }

  async function rateHistory() {
    const { data } = await supabase.from('royalty_rate_history').select('*').order('changed_at', { ascending: false })
    return data ?? []
  }

  /** Realtime: новая продажа принта дизайнера. */
  function subscribeSales(onChange: () => void) {
    const channel = supabase
      .channel('designer-sales')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'royalty_earnings', filter: `designer_id=eq.${user.value!.id}` },
        onChange)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  return {
    profile, balance, earnings, myPrints, printStats, uploadPrintFile, createPrint, updatePrint, removePrint,
    payouts, requestPayout, updateProfile, rateHistory, subscribeSales,
  }
}
