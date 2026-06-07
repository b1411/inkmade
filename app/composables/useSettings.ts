import type { Database } from '~/types/database.types'

// Настройки платформы key/value (CRM §6.12). Чтение публичное, запись — admin.
export const useSettings = () => {
  const supabase = useSupabaseClient<Database>()

  async function all() {
    const { data } = await supabase.from('platform_settings').select('*').order('key')
    return data ?? []
  }

  async function get<T = unknown>(key: string): Promise<T | null> {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle()
    return (data?.value as T) ?? null
  }

  async function set(key: string, value: unknown) {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value: value as never, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }

  return { all, get, set }
}
