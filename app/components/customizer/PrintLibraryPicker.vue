<script setup lang="ts">
import type { Tables } from '~/types/database.types'

// Выбор готового принта из курируемой библиотеки (§11.1).
const { addImage } = useDesign()
const { listActive } = usePrintLibrary()
const toast = useToast()

const open = ref(false)
const prints = ref<Tables<'print_library'>[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try { prints.value = await listActive() } catch (e) {
    toast.add({ title: 'Не удалось загрузить библиотеку', description: (e as Error).message, color: 'error' })
  } finally { loading.value = false }
}

watch(open, (v) => { if (v && !prints.value.length) load() })

function pick(p: Tables<'print_library'>) {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    addImage(p.file_url, img.naturalWidth || 1000, img.naturalHeight || 1000, 'library')
    open.value = false
    toast.add({ title: `Принт «${p.title}» добавлен`, color: 'success' })
  }
  img.onerror = () => toast.add({ title: 'Не удалось загрузить принт', color: 'error' })
  img.src = p.file_url
}
</script>

<template>
  <div>
    <UButton color="neutral" variant="subtle" icon="i-lucide-image" block @click="open = true">
      Выбрать из библиотеки
    </UButton>

    <UModal v-model:open="open" title="Готовые принты">
      <template #body>
        <div v-if="loading" class="py-8 text-center text-ink-gray-600">Загрузка…</div>
        <div v-else-if="!prints.length" class="py-8 text-center text-ink-gray-600">Библиотека пока пуста.</div>
        <div v-else class="grid grid-cols-3 gap-3">
          <button
            v-for="p in prints"
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
