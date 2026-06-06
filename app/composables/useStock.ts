import type { Database } from '~/types/database.types'

// Склад заготовок (§8.2.4, §5.3.1). Источник истины остатка — stock_movements;
// variants.stock — денормализованная сумма для скорости.
export const useStock = () => {
  const supabase = useSupabaseClient<Database>()

  /** Варианты с остатками (+ товар). */
  async function listStock() {
    const { data, error } = await supabase
      .from('variants')
      .select('id, sku, color_name, color_hex, size, stock, product_id, products(title, slug)')
      .order('stock', { ascending: true })
    if (error) throw error
    return data
  }

  /** Приход/коррекция/брак: пишет движение и обновляет денормализованный остаток. */
  async function addMovement(variantId: string, delta: number, reason: 'purchase' | 'correction' | 'defect', orderId?: string) {
    const user = useSupabaseUser()
    const { error: mErr } = await supabase.from('stock_movements').insert({
      variant_id: variantId,
      delta,
      reason,
      order_id: orderId ?? null,
      actor_id: user.value?.id ?? null,
    })
    if (mErr) throw mErr

    // обновляем денормализованный остаток (для MVP — read-modify-write)
    const { data: v, error: rErr } = await supabase.from('variants').select('stock').eq('id', variantId).single()
    if (rErr) throw rErr
    const next = Math.max(0, (v?.stock ?? 0) + delta)
    const { error: uErr } = await supabase.from('variants').update({ stock: next }).eq('id', variantId)
    if (uErr) throw uErr
    return next
  }

  async function listMovements(variantId: string) {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  return { listStock, addMovement, listMovements }
}
