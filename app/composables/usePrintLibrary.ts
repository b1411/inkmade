import type { Database, TablesInsert } from '~/types/database.types'
import { assertSafeUpload } from '~/utils/upload-guard'

// Библиотека готовых принтов (§11.1) — отдельный канал: принты бренда и отобранных художников.
// Запись доступна только admin (RLS print_library_write_admin). Файлы — в бакет catalog.
export const usePrintLibrary = () => {
  const supabase = useSupabaseClient<Database>()

  // витрина: только активные
  async function listActive() {
    const { data, error } = await supabase
      .from('print_library')
      .select('*')
      .eq('is_active', true)
      .order('title')
    if (error) throw error
    return data
  }

  // админка: все, включая снятые с публикации
  async function listAll() {
    const { data, error } = await supabase.from('print_library').select('*').order('title')
    if (error) throw error
    return data
  }

  async function uploadFile(file: File): Promise<string> {
    const { contentType } = await assertSafeUpload(file)
    const ext = file.name.split('.').pop() || 'png'
    const path = `library/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const { error } = await supabase.storage.from('catalog').upload(path, file, { upsert: false, contentType })
    if (error) throw error
    return supabase.storage.from('catalog').getPublicUrl(path).data.publicUrl
  }

  async function create(payload: TablesInsert<'print_library'>) {
    const { data, error } = await supabase.from('print_library').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async function update(id: string, patch: Partial<TablesInsert<'print_library'>>) {
    const { data, error } = await supabase.from('print_library').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function remove(id: string) {
    const { data: row } = await supabase.from('print_library').select('file_url, thumbnail_url').eq('id', id).single()
    const { error } = await supabase.from('print_library').delete().eq('id', id)
    if (error) throw error
    // очистка файлов из бакета catalog (best-effort)
    const paths = [row?.file_url, row?.thumbnail_url]
      .map((u) => {
        if (!u) return null
        const i = u.indexOf('/catalog/')
        return i >= 0 ? u.slice(i + '/catalog/'.length) : null
      })
      .filter((p): p is string => !!p)
    if (paths.length) await supabase.storage.from('catalog').remove(paths)
  }

  return { listActive, listAll, uploadFile, create, update, remove }
}
