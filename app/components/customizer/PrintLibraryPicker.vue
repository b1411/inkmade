<script setup lang="ts">
import type { Tables } from '~/types/database.types'

// Выбор готового принта из курируемой библиотеки (§11.1).
// Показываем только принты, совместимые с текущим методом печати (compatible_methods
// пусто = совместим со всеми). Метод определяется выбранным материалом (§5.2.1).
const { t } = useI18n()
const { addImage, material } = useDesign()
const { listActive } = usePrintLibrary()
const toast = useToast()

const open = ref(false)
const prints = ref<Tables<'print_library'>[]>([])
const loading = ref(false)

const visiblePrints = computed(() => {
  const m = material.value?.print_method
  return prints.value.filter(p => !p.compatible_methods?.length || (!!m && p.compatible_methods.includes(m)))
})

async function load() {
  loading.value = true
  try { prints.value = await listActive() } catch (e) {
    toast.add({ title: t('customize.library.loadFailed'), description: (e as Error).message, color: 'error' })
  } finally { loading.value = false }
}

watch(open, (v) => { if (v && !prints.value.length) load() })

function pick(p: Tables<'print_library'>) {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    addImage(p.file_url, img.naturalWidth || 1000, img.naturalHeight || 1000, 'library', p.id)
    open.value = false
    toast.add({ title: t('customize.library.added', { title: p.title }), color: 'success' })
  }
  img.onerror = () => toast.add({ title: t('customize.library.loadPrintFailed'), color: 'error' })
  img.src = p.file_url
}
</script>

<template>
  <div>
    <UButton color="neutral" variant="subtle" icon="i-lucide-image" block @click="open = true">
      {{ $t('customize.library.button') }}
    </UButton>

    <UModal v-model:open="open" :title="$t('customize.library.title')">
      <template #body>
        <div v-if="loading" class="py-8 text-center text-ink-gray-600">{{ $t('customize.library.loading') }}</div>
        <div v-else-if="!visiblePrints.length" class="py-8 text-center text-ink-gray-600">{{ $t('customize.library.empty') }}</div>
        <div v-else class="grid grid-cols-3 gap-3">
          <button
            v-for="p in visiblePrints"
            :key="p.id"
            class="border border-ink-gray-200 rounded-md overflow-hidden hover:border-ink-burgundy transition-colors"
            @click="pick(p)"
          >
            <img :src="p.thumbnail_url || p.file_url" :alt="p.title" class="aspect-square object-cover w-full">
            <span class="block text-caption p-1 truncate">{{ p.title }}</span>
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
