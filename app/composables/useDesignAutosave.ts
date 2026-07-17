import type { Json } from '~/types/database.types'

type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error'

interface GuestDraft {
  key: string
  spec: unknown
  revision: number
  updatedAt: string
}

interface AutosaveOptions {
  productId: string
  draftKey: string
  toSpec: () => unknown
  loadSpec: (spec: unknown) => void
}

const DB_NAME = 'inkmade-designs'
const STORE = 'drafts'

function openDraftDb(): Promise<IDBDatabase | null> {
  if (!import.meta.client || !('indexedDB' in window)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function getGuestDraft(key: string): Promise<GuestDraft | null> {
  const db = await openDraftDb()
  if (!db) return null
  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    request.onsuccess = () => resolve((request.result as GuestDraft | undefined) ?? null)
    request.onerror = () => resolve(null)
  })
}

async function putGuestDraft(draft: GuestDraft): Promise<void> {
  const db = await openDraftDb()
  if (!db) return
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(draft)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function useDesignAutosave(options: AutosaveOptions) {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const status = ref<AutosaveStatus>('idle')
  const lastSavedAt = ref<string | null>(null)
  const conflict = ref<{ spec: unknown; revision: number; updatedAt: string } | null>(null)
  const draftId = ref<string | null>(null)
  const revision = ref(0)
  const started = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopWatch: (() => void) | null = null

  const storageKey = computed(() => `design:${options.productId}:${options.draftKey}`)

  async function restore(): Promise<boolean> {
    if (!import.meta.client) return false
    if (user.value) {
      const { data } = await supabase
        .from('designs')
        .select('id, spec, revision, updated_at')
        .eq('user_id', user.value.id)
        .eq('product_id', options.productId)
        .eq('draft_status', 'draft')
        .eq('draft_key', options.draftKey)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) return false
      draftId.value = data.id
      revision.value = data.revision
      lastSavedAt.value = data.updated_at
      options.loadSpec(data.spec)
      status.value = 'saved'
      return true
    }

    const draft = await getGuestDraft(storageKey.value)
    if (!draft) return false
    revision.value = draft.revision
    lastSavedAt.value = draft.updatedAt
    options.loadSpec(draft.spec)
    status.value = 'saved'
    return true
  }

  async function saveGuest(spec: unknown) {
    const updatedAt = new Date().toISOString()
    revision.value += 1
    await putGuestDraft({ key: storageKey.value, spec, revision: revision.value, updatedAt })
    lastSavedAt.value = updatedAt
  }

  async function saveServer(spec: unknown) {
    if (!user.value) return saveGuest(spec)
    const nextRevision = revision.value + 1
    if (!draftId.value) {
      const { data, error } = await supabase.from('designs').insert({
        user_id: user.value.id,
        product_id: options.productId,
        spec: spec as Json,
        draft_status: 'draft',
        draft_key: options.draftKey,
        revision: nextRevision,
        is_saved: false,
      }).select('id, revision, updated_at').single()
      if (error) throw error
      draftId.value = data.id
      revision.value = data.revision
      lastSavedAt.value = data.updated_at
      return
    }

    const { data, error } = await supabase.from('designs')
      .update({ spec: spec as Json, revision: nextRevision, draft_status: 'draft' })
      .eq('id', draftId.value)
      .eq('revision', revision.value)
      .select('revision, updated_at')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      const { data: latest } = await supabase.from('designs')
        .select('spec, revision, updated_at')
        .eq('id', draftId.value)
        .single()
      if (latest) {
        conflict.value = { spec: latest.spec, revision: latest.revision, updatedAt: latest.updated_at }
        status.value = 'conflict'
      }
      return
    }
    revision.value = data.revision
    lastSavedAt.value = data.updated_at
  }

  async function flush() {
    if (!import.meta.client || status.value === 'saving' || status.value === 'conflict') return
    status.value = 'saving'
    try {
      await saveServer(options.toSpec())
      if (!conflict.value) status.value = 'saved'
    } catch {
      status.value = 'error'
    }
  }

  function markDirty() {
    if (!started.value || status.value === 'conflict') return
    status.value = 'dirty'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void flush() }, 1000)
  }

  function start() {
    if (!import.meta.client || started.value) return
    started.value = true
    stopWatch = watch(() => JSON.stringify(options.toSpec()), markDirty)
  }

  function useLatestSaved() {
    if (!conflict.value) return
    options.loadSpec(conflict.value.spec)
    revision.value = conflict.value.revision
    lastSavedAt.value = conflict.value.updatedAt
    conflict.value = null
    status.value = 'saved'
  }

  function keepCurrent() {
    if (!conflict.value) return
    revision.value = conflict.value.revision
    conflict.value = null
    status.value = 'dirty'
    void flush()
  }

  if (import.meta.client) {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (status.value !== 'dirty' && status.value !== 'saving') return
      event.preventDefault()
      event.returnValue = ''
    }
    onMounted(() => window.addEventListener('beforeunload', beforeUnload))
    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', beforeUnload)
      stopWatch?.()
      if (timer) clearTimeout(timer)
      if (status.value === 'dirty') void flush()
    })
  }

  return { status, lastSavedAt, conflict, restore, start, flush, useLatestSaved, keepCurrent }
}
