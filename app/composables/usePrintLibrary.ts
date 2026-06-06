import type { Database } from '~/types/database.types'

// Библиотека готовых принтов (§11.1) — отдельный канал: принты бренда и отобранных художников.
export const usePrintLibrary = () => {
  const supabase = useSupabaseClient<Database>()

  async function listActive() {
    const { data, error } = await supabase
      .from('print_library')
      .select('*')
      .eq('is_active', true)
      .order('title')
    if (error) throw error
    return data
  }

  return { listActive }
}
