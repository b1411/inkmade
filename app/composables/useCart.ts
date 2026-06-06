import type { Json } from '~/types/database.types'

// Гостевая корзина (§9.1): состояние хранится локально до оплаты, без логина.
export interface CartItem {
  id: string
  productId: string
  slug: string
  alias: string | null
  title: string
  variantId: string
  colorName: string
  colorHex: string
  size: string
  printMethod: string | null
  spec: Json
  unitPrice: number
  quantity: number
}

const STORAGE_KEY = 'inkmade_cart'

export const useCart = () => {
  const items = useState<CartItem[]>('cart_items', () => [])

  // загрузка/сохранение в localStorage (только клиент)
  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw)
    } catch { /* ignore */ }
  }
  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  function add(item: Omit<CartItem, 'id'>) {
    const id = `ci_${Date.now()}_${Math.round(Math.random() * 1e6)}`
    items.value = [...items.value, { ...item, id }]
    persist()
  }
  function remove(id: string) {
    items.value = items.value.filter(i => i.id !== id)
    persist()
  }
  function updateQty(id: string, quantity: number) {
    items.value = items.value.map(i => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
    persist()
  }
  function clear() {
    items.value = []
    persist()
  }

  const count = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
  const total = computed(() => items.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0))

  return { items, count, total, load, persist, add, remove, updateQty, clear }
}
