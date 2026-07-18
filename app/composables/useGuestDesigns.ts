import type { Json } from '~/types/database.types'

// Гостевые сохранённые дизайны (CRM §3.2 «перенос локальных данных в аккаунт»).
// Гость может «сохранить дизайн на потом» без логина — он лежит в localStorage,
// а при входе переносится в кабинет (designs, is_saved=true) плагином guest-import.
export interface GuestDesign {
  productId: string
  variantId?: string | null
  alias: string | null
  title: string
  spec: Json
  previewUrl: string | null
  savedAt: number
}

const STORAGE_KEY = 'inkmade_guest_designs'
const MAX_ITEMS = 20

export const useGuestDesigns = () => {
  function list(): GuestDesign[] {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as GuestDesign[]) : []
    } catch {
      return []
    }
  }
  function add(d: Omit<GuestDesign, 'savedAt'>) {
    if (!import.meta.client) return
    const next = [...list(), { ...d, savedAt: Date.now() }].slice(-MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  function clear() {
    if (!import.meta.client) return
    localStorage.removeItem(STORAGE_KEY)
  }
  const count = () => list().length

  return { list, add, clear, count }
}
