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

  // isPublic=true по умолчанию: настройки, заводимые из админки (контент лендинга и пр.),
  // должны читаться анонимом (см. ps_read, миграция 0057). Секрет/приватный ключ —
  // передать isPublic=false; ключи, заведённые в обход set() (миграция/сервис), приватны.
  async function set(key: string, value: unknown, isPublic = true) {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value: value as never, is_public: isPublic, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }

  return { all, get, set }
}
