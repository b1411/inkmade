<script setup lang="ts">
import { dpiAtMaxSize, DPI_MIN, DPI_TARGET } from '~~/shared/config/zones'

// Загрузка принта + DPI-валидация на входе (§10, инвариант 1; §5.6).
// Порог считается от МАКСИМАЛЬНОГО размера изделия (products.max_print_mm).
const { product, addImage } = useDesign()
const toast = useToast()
const supabase = useSupabaseClient()

const MAX_FILE_MB = 25
const ACCEPT = '.png,.jpg,.jpeg,.svg,.pdf'
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Загрузка оригинала в Storage (§13.2): файл должен пережить сессию, иначе
// оператор не получит исходник для печати. Возвращает постоянный public URL.
async function uploadToStorage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
  const { error } = await supabase.storage.from('design-uploads').upload(path, file, {
    contentType: file.type || undefined, upsert: false,
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
    // preflight: размер
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.add({ title: 'Файл слишком большой', description: `Лимит ${MAX_FILE_MB} МБ.`, color: 'error' })
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const isVector = ext === 'svg' || ext === 'pdf'
    const objectUrl = URL.createObjectURL(file)

    // вектор (SVG/PDF) не теряет качество — DPI не проверяем (§5.6)
    if (isVector) {
      // для отрисовки на холсте берём условные размеры (svg рендерится как изображение)
      const size = ext === 'svg' ? await readImageSize(objectUrl).catch(() => ({ w: 1000, h: 1000 })) : { w: 1000, h: 1000 }
      const url = await uploadToStorage(file)
      URL.revokeObjectURL(objectUrl)
      addImage(url, size.w, size.h, 'upload')
      toast.add({ title: 'Принт добавлен', color: 'success' })
      return
    }

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

    const url = await uploadToStorage(file)
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
      PNG, JPG, SVG, PDF · до {{ MAX_FILE_MB }} МБ. Минимум {{ DPI_MIN }} DPI на макс. размере, цель {{ DPI_TARGET }}.
    </p>
  </div>
</template>
