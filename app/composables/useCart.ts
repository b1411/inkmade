import type { Database, Json } from '~/types/database.types'

// Корзина (§9.1). Гость хранит её локально (localStorage). Залогиненный — на сервере
// (таблица cart_items, RLS), что даёт кросс-девайс. При входе локальная корзина
// сливается в серверную и локальный кэш очищается. Реактивное состояние `items`
// едино для всех компонентов; синхронизацию входа/выхода ведёт плагин cart-sync.client.
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

// id позиции — настоящий uuid (он же PK строки cart_items на сервере)
function newId(): string {
  if (import.meta.client && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ci_${Date.now()}_${Math.round(Math.random() * 1e9)}`
}

// дебаунс серверного пуша — модульный синглтон (клиент)
let pushTimer: ReturnType<typeof setTimeout> | null = null

export const useCart = () => {
  const items = useState<CartItem[]>('cart_items', () => [])
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  // ── локальный кэш (гость) ─────────────────────────────────────
  function readLocal(): CartItem[] {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as CartItem[]) : []
    } catch { return [] }
  }
  function writeLocal(v: CartItem[]) {
    if (!import.meta.client) return
    // приватный режим Safari / переполнение квоты бросают здесь. Раньше throw уходил
    // вверх через persist() в любую мутацию (remove/updateQty) необработанным.
    // Глушим запись (позиция остаётся в памяти на эту сессию), не валим поток.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    } catch { /* квота/приватный режим — кэш не записан, состояние живёт в памяти */ }
  }
  function clearLocal() {
    if (!import.meta.client) return
    localStorage.removeItem(STORAGE_KEY)
  }

  // гость читает localStorage; у залогиненного источник истины — сервер (тянет плагин)
  function load() {
    if (user.value) return
    items.value = readLocal()
  }

  // сохранение после любой мутации: гость → localStorage, залогиненный → дебаунс-пуш
  function persist() {
    if (!import.meta.client) return
    if (user.value) { schedulePush(); return }
    writeLocal(items.value)
  }
  function schedulePush() {
    if (!import.meta.client || !user.value) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => { void pushToServer() }, 500)
  }

  // ── маппинг строка БД ↔ позиция корзины ───────────────────────
  type Row = Database['public']['Tables']['cart_items']['Row']
  function toRow(i: CartItem, userId: string): Database['public']['Tables']['cart_items']['Insert'] {
    return {
      id: i.id, user_id: userId, product_id: i.productId, variant_id: i.variantId || null,
      slug: i.slug, alias: i.alias, title: i.title, color_name: i.colorName, color_hex: i.colorHex,
      size: i.size, print_method: i.printMethod, spec: i.spec, unit_price: i.unitPrice, quantity: i.quantity,
    }
  }
  function fromRow(r: Row): CartItem {
    return {
      id: r.id, productId: r.product_id, slug: r.slug, alias: r.alias, title: r.title,
      variantId: r.variant_id ?? '', colorName: r.color_name, colorHex: r.color_hex, size: r.size,
      printMethod: r.print_method, spec: r.spec, unitPrice: Number(r.unit_price), quantity: r.quantity,
    }
  }

  // ── серверная синхронизация ───────────────────────────────────
  // снапшот-замена: для маленькой корзины проще и надёжнее, чем диффы по строкам.
  async function pushToServer() {
    if (!user.value) return
    const uid = user.value.id
    try {
      // upsert-then-delete-stale вместо delete-all-then-insert: при сбое insert старая
      // серверная корзина НЕ теряется (id клиентские и стабильные → conflict на id).
      const ids = items.value.map(i => i.id)
      if (items.value.length) {
        const { error } = await supabase.from('cart_items').upsert(items.value.map(i => toRow(i, uid)))
        if (error) return
      }
      // удалить строки, которых больше нет в текущей корзине
      let del = supabase.from('cart_items').delete().eq('user_id', uid)
      if (ids.length) del = del.not('id', 'in', `(${ids.join(',')})`)
      await del
    } catch { /* сеть/офлайн — повторим при следующей мутации */ }
  }
  async function pullFromServer(): Promise<CartItem[]> {
    if (!user.value) return []
    const { data, error } = await supabase
      .from('cart_items').select('*').order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map(fromRow)
  }

  // вход: серверная корзина + гостевые позиции (с новыми id), локальный кэш очищаем,
  // чтобы при следующем входе гостевые позиции не задвоились. На обычном перезаходе
  // залогиненного гостевой кэш пуст → merged = серверная корзина (идемпотентно).
  async function syncOnLogin() {
    if (!user.value) return
    const guest = readLocal()
    const server = await pullFromServer()
    items.value = [...server, ...guest.map(i => ({ ...i, id: newId() }))]
    clearLocal()
    if (guest.length) await pushToServer()
  }
  // выход: не показываем гостю корзину прошлого пользователя
  function clearOnLogout() {
    items.value = []
    clearLocal()
  }

  // ── мутации ───────────────────────────────────────────────────
  function add(item: Omit<CartItem, 'id'>) {
    items.value = [...items.value, { ...item, id: newId() }]
    persist()
  }
  // полная замена позиции (доработка из корзины §9.1): тот же id, новый spec/вариант/цена
  function update(id: string, item: Omit<CartItem, 'id'>) {
    items.value = items.value.map(i => (i.id === id ? { ...item, id } : i))
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

  return {
    items, count, total, load, persist,
    add, update, remove, updateQty, clear,
    syncOnLogin, clearOnLogout,
  }
}
