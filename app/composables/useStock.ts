import type { Database } from '~/types/database.types'

// Склад заготовок (§8.2.4, §5.3.1). Источник истины остатка — stock_movements;
// variants.stock — денормализованная сумма для скорости.
export const useStock = () => {
  const supabase = useSupabaseClient<Database>()

  /** Варианты с остатками (+ товар). БЕЗ себестоимости — для оператора (§5.2). */
  async function listStock() {
    const { data, error } = await supabase
      .from('variants')
      .select('id, sku, color_name, color_hex, size, stock, product_id, products(title, slug)')
      .order('stock', { ascending: true })
    if (error) throw error
    return data
  }

  /** То же + себестоимость заготовки. Только для admin (склад/маржа §6.2/§6.6). */
  async function listStockWithCost() {
    const { data, error } = await supabase
      .from('variants')
      .select('id, sku, color_name, color_hex, size, stock, blank_cost, product_id, products(title, slug)')
      .order('stock', { ascending: true })
    if (error) throw error
    return data
  }

  /** Приход/коррекция/брак: движение + остаток атомарно через RPC (аудит H5). */
  async function addMovement(variantId: string, delta: number, reason: 'purchase' | 'correction' | 'defect') {
    const { data, error } = await supabase.rpc('adjust_stock', {
      p_variant_id: variantId,
      p_delta: delta,
      p_reason: reason,
    })
    if (error) throw error
    return data as number
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

  return { listStock, listStockWithCost, addMovement, listMovements }
}
