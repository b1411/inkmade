import type { Database, TablesInsert } from '~/types/database.types'

// Адреса доставки клиента (CRM §3.1). RLS — только свои.
export const useAddresses = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { t } = useI18n()

  async function list() {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function create(payload: Omit<TablesInsert<'addresses'>, 'user_id'>) {
    if (!user.value) throw new Error(t('errors.authRequired'))
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...payload, user_id: user.value.id })
      .select().single()
    if (error) throw error
    return data
  }

  async function update(id: string, patch: Partial<TablesInsert<'addresses'>>) {
    const { error } = await supabase.from('addresses').update(patch).eq('id', id)
    if (error) throw error
  }

  async function remove(id: string) {
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) throw error
  }

  async function setDefault(id: string) {
    if (!user.value) return
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.value.id)
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    if (error) throw error
  }

  return { list, create, update, remove, setDefault }
}
