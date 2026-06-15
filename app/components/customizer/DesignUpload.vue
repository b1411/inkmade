<script setup lang="ts">
import { dpiAtMaxSize, DPI_MIN, DPI_TARGET } from '~~/shared/config/zones'
import { assertSafeUpload } from '~/utils/upload-guard'

// Загрузка принта + DPI-валидация на входе (§10, инвариант 1; §5.6).
// Порог считается от МАКСИМАЛЬНОГО размера изделия (products.max_print_mm).
const { product, addImage } = useDesign()
const toast = useToast()
const supabase = useSupabaseClient()

const MAX_FILE_MB = 25
// растровые форматы + PDF-вектор. SVG исключён (XSS в публичном бакете).
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif,.pdf'
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Загрузка оригинала в Storage (§13.2): файл должен пережить сессию, иначе
// оператор не получит исходник для печати. Возвращает постоянный public URL.
// contentType берётся из проверенной сигнатуры, НЕ из file.type (подделываем).
async function uploadToStorage(file: File, contentType: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
  const { error } = await supabase.storage.from('design-uploads').upload(path, file, {
    contentType, upsert: false,
  })
  if (error) throw error
  return supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
}

function readImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true
  try {
    // проверка сигнатуры + размера (magic-bytes, не доверяем расширению/MIME)
    let guard: Awaited<ReturnType<typeof assertSafeUpload>>
    try {
      guard = await assertSafeUpload(file, { maxMb: MAX_FILE_MB })
    } catch (err) {
      toast.add({ title: 'Файл отклонён', description: err instanceof Error ? err.message : '', color: 'error' })
      return
    }

    // PDF-вектор не теряет качество — DPI не проверяем (§5.6), условные размеры
    if (guard.kind === 'pdf') {
      const url = await uploadToStorage(file, guard.contentType)
      addImage(url, 1000, 1000, 'upload')
      toast.add({ title: 'Принт добавлен', color: 'success' })
      return
    }

    const objectUrl = URL.createObjectURL(file)
    // растр: считаем DPI на МАКСИМАЛЬНОМ размере изделия (§10)
    const { w, h } = await readImageSize(objectUrl)
    const maxPrint = product.value?.max_print_mm as { width: number; height: number } | null
    if (!maxPrint?.width || !maxPrint?.height) {
      toast.add({ title: 'Нет данных о размере печати', description: 'У товара не задан max_print_mm.', color: 'error' })
      URL.revokeObjectURL(objectUrl)
      return
    }

    const dpi = dpiAtMaxSize(w, h, maxPrint)
    if (dpi < DPI_MIN) {
      // БЛОКИРУЕМ загрузку — иначе поток брака (§10)
      toast.add({
        title: 'Низкое разрешение',
        description: `На макс. размере изделия ${dpi} DPI (нужно от ${DPI_MIN}). Загрузите файл большего разрешения.`,
        color: 'error',
      })
      URL.revokeObjectURL(objectUrl)
      return
    }

    const url = await uploadToStorage(file, guard.contentType)
    URL.revokeObjectURL(objectUrl)
    addImage(url, w, h, 'upload')
    if (dpi < DPI_TARGET) {
      toast.add({ title: `Принт добавлен · ${dpi} DPI`, description: `Для лучшего качества цель — ${DPI_TARGET} DPI.`, color: 'warning' })
    } else {
      toast.add({ title: `Принт добавлен · ${dpi} DPI`, color: 'success' })
    }
  } catch {
    toast.add({ title: 'Не удалось обработать файл', color: 'error' })
  } finally {
    busy.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div>
    <UButton color="primary" icon="i-lucide-upload" :loading="busy" block @click="fileInput?.click()">Загрузить принт</UButton>
    <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFile">
    <p class="text-caption text-ink-gray-400 mt-2">
      PNG, JPG, WEBP, GIF, AVIF или PDF · до {{ MAX_FILE_MB }} МБ. Минимум {{ DPI_MIN }} DPI на макс. размере, цель {{ DPI_TARGET }}.
    </p>
  </div>
</template>
