import type { Database, TablesInsert } from '~/types/database.types'

// Категории каталога (§6). Публичное чтение активных; запись — только admin
// (RLS categories_write_admin). Удаление категории с товарами запрещено FK (restrict).
export const useCategories = () => {
  const supabase = useSupabaseClient<Database>()

  async function listActive() {
    if (isE2eSeededCatalog()) return structuredClone(e2eCategories)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('title')
    if (error) throw error
    return data
  }

  async function listAll() {
    if (isE2eSeededCatalog()) return structuredClone(e2eCategories)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .order('title')
    if (error) throw error
    return data
  }

  async function create(payload: TablesInsert<'categories'>) {
    const { data, error } = await supabase.from('categories').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async function update(id: string, patch: Partial<TablesInsert<'categories'>>) {
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function remove(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  }

  return { listActive, listAll, create, update, remove }
}
