<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Шаг 5 — Фото (§8.2.1). Публичный бакет catalog. Основное фото — для карточки.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { uploadCatalogImage, addImage, deleteImage, setPrimaryImage } = useAdmin()
const toast = useToast()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
async function onUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      const url = await uploadCatalogImage(props.product.id, file)
      const isFirst = props.product.product_images.length === 0
      await addImage(props.product.id, url, isFirst, props.product.product_images.length)
    }
    emit('changed')
  } catch (err) {
    toast.add({ title: 'Ошибка загрузки', description: (err as Error).message, color: 'error' })
  } finally {
    uploading.value = false
  }
}

async function onPrimary(id: string) {
  try { await setPrimaryImage(props.product.id, id); emit('changed') } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  }
}
async function onDelete(id: string) {
  try { await deleteImage(id); emit('changed') } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <UButton color="primary" icon="i-lucide-upload" :loading="uploading" @click="fileInput?.click()">Загрузить фото</UButton>
    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onUpload">

    <div v-if="product.product_images.length" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div
        v-for="img in product.product_images"
        :key="img.id"
        class="relative group border border-ink-gray-200 rounded-md overflow-hidden"
      >
        <img :src="img.url" alt="" class="aspect-square object-cover w-full">
        <UBadge v-if="img.is_primary" color="primary" class="absolute top-2 left-2">Основное</UBadge>
        <div class="absolute inset-x-0 bottom-0 p-2 flex gap-1 justify-between bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton v-if="!img.is_primary" color="neutral" size="xs" variant="solid" @click="onPrimary(img.id)">Сделать осн.</UButton>
          <UButton color="error" size="xs" variant="solid" icon="i-lucide-trash-2" @click="onDelete(img.id)" />
        </div>
      </div>
    </div>
    <p v-else class="text-ink-gray-600">Фото ещё не загружены.</p>
  </div>
</template>
