<script setup lang="ts">
import type { Tables } from '~/types/database.types'

// Выбор готового принта из курируемой библиотеки (§11.1).
// Показываем только принты, совместимые с текущим методом печати (compatible_methods
// пусто = совместим со всеми). Метод определяется выбранным материалом (§5.2.1).
const { t, locale } = useI18n()
const { addImage, material } = useDesign()
const { listActive } = usePrintLibrary()
const toast = useToast()

const open = ref(false)
const prints = ref<Tables<'print_library'>[]>([])
const loading = ref(false)
const query = ref('')

const visiblePrints = computed(() => {
  const m = material.value?.print_method
  const term = query.value.trim().toLocaleLowerCase()
  return prints.value.filter((p) => {
    if (p.compatible_methods?.length && (!m || !p.compatible_methods.includes(m))) return false
    if (!term) return true
    return [p.title, p.author, ...(p.tags ?? [])]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(term))
  })
})

async function load() {
  loading.value = true
  try { prints.value = await listActive() } catch (e) {
    toast.add({ title: t('customize.library.loadFailed'), description: getFetchMessage(e), color: 'error' })
  } finally { loading.value = false }
}

watch(open, (v) => { if (v && !prints.value.length) load() })

function pick(p: Tables<'print_library'>) {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const pl = addImage(p.file_url, img.naturalWidth || 1000, img.naturalHeight || 1000, 'library', p.id)
    if (!pl) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
    open.value = false
    toast.add({ title: t('customize.library.added', { title: p.title }), color: 'success' })
  }
  img.onerror = () => toast.add({ title: t('customize.library.loadPrintFailed'), color: 'error' })
  img.src = p.file_url
}
</script>

<template>
  <div>
    <UButton color="neutral" variant="subtle" icon="i-lucide-layout-grid" block @click="open = true">
      {{ $t('customize.library.button') }}
      <span v-if="prints.length" class="ml-auto rounded-full bg-ink-burgundy px-2 py-0.5 text-[10px] font-bold text-white">{{ prints.length }}</span>
    </UButton>

    <UModal v-model:open="open" :title="$t('customize.library.title')" :ui="{ content: 'sm:max-w-5xl' }">
      <template #body>
        <div class="mb-5 flex flex-col gap-3 border-b border-ink-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="ink-label text-ink-burgundy">INKMADE CURATED / 01</p>
            <p class="mt-1 max-w-xl text-sm text-ink-gray-600">
              {{ locale === 'kk' ? 'Баспаға дайын авторлық графиканы таңдаңыз. Принт макетке бірден қосылады.' : 'Выберите авторскую графику, подготовленную для печати. Принт сразу появится на макете.' }}
            </p>
          </div>
          <UInput
            v-model="query"
            icon="i-lucide-search"
            :placeholder="locale === 'kk' ? 'Атауы немесе тег бойынша' : 'Поиск по названию или тегу'"
            class="w-full sm:w-72"
          />
        </div>

        <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <UiSkeleton v-for="n in 8" :key="n" rounded="rounded-none" class="aspect-square" />
        </div>
        <UiEmptyState
          v-else-if="!visiblePrints.length"
          icon="i-lucide-search-x"
          :title="$t('customize.library.empty')"
          :text="query ? (locale === 'kk' ? 'Басқа сұрау енгізіп көріңіз.' : 'Попробуйте изменить поисковый запрос.') : ''"
        />
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="p in visiblePrints"
            :key="p.id"
            type="button"
            class="group overflow-hidden border border-ink-gray-200 bg-ink-paper text-left transition-all hover:-translate-y-0.5 hover:border-ink-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-burgundy"
            @click="pick(p)"
          >
            <span class="relative block aspect-square overflow-hidden bg-ink-black">
              <img :src="p.thumbnail_url || p.file_url" :alt="p.title" class="size-full object-cover transition duration-500 group-hover:scale-[1.035]">
              <span class="absolute inset-x-0 bottom-0 translate-y-full bg-ink-black/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur transition-transform group-hover:translate-y-0">
                {{ locale === 'kk' ? 'Макетке қосу' : 'Добавить на макет' }}
              </span>
            </span>
            <span class="block p-3">
              <span class="block truncate text-sm font-semibold">{{ p.title }}</span>
              <span class="mt-1 block truncate text-[11px] text-ink-gray-500">{{ p.author || 'INKMADE Studio' }}</span>
            </span>
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
