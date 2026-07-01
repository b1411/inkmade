import type { Database } from '~/types/database.types'

// Клиентские заявки на отмену/возврат заказа (Фаза C3). Клиент создаёт по своему
// заказу (RLS owner_insert, только status=pending), персонал читает и резолвит.
export const useOrderRequests = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function listForOrder(orderId: string) {
    const { data, error } = await supabase
      .from('order_requests')
      .select('id, kind, reason, status, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async function create(orderId: string, kind: 'cancel' | 'return', reason: string) {
    if (!user.value) throw new Error('auth')
    const { error } = await supabase.from('order_requests').insert({
      order_id: orderId,
      user_id: user.value.id,
      kind,
      reason: reason.trim() || null,
    })
    if (error) throw error
  }

  async function resolve(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('order_requests')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: user.value?.id ?? null })
      .eq('id', id)
    if (error) throw error
  }

  return { listForOrder, create, resolve }
}
