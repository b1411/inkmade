<script setup lang="ts">
import { DPI_MIN, DPI_TARGET } from '~~/shared/config/zones'
import { assertSafeUpload } from '~/utils/upload-guard'
import type { Placement } from '~/composables/useDesign'

// Загрузка принта. DPI больше НЕ блокирует — принимаем любой растр любого
// разрешения и PDF (рендерим в PNG на клиенте). Низкое качество = предупреждение;
// оператор согласует с клиентом перед печатью. DPI считается по РЕАЛЬНОМУ размеру
// принта на холсте (dpiOf) и обновляется в инспекторе при ресайзе.
const { t } = useI18n()
const { addImage, dpiOf } = useDesign()
const toast = useToast()
const supabase = useSupabaseClient()

const MAX_FILE_MB = 25
// растровые форматы + PDF. SVG исключён (XSS в публичном бакете). PDF принимаем:
// первую страницу растеризуем в PNG для холста/печати, оригинал храним оператору.
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf'
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Единый тост качества по реальному DPI плейсмента (vector/PDF → dpiOf=null → ok).
function notifyAdded(pl: Placement) {
  const dpi = dpiOf(pl)
  if (dpi == null) {
    toast.add({ title: t('customize.upload.added'), color: 'success' })
  } else if (dpi < DPI_MIN) {
    toast.add({ title: t('customize.upload.addedDpi', { dpi }), description: t('customize.upload.lowQualityHint', { dpiTarget: DPI_TARGET }), color: 'warning' })
  } else if (dpi < DPI_TARGET) {
    toast.add({ title: t('customize.upload.addedDpi', { dpi }), description: t('customize.upload.targetDpiHint', { dpiTarget: DPI_TARGET }), color: 'warning' })
  } else {
    toast.add({ title: t('customize.upload.addedDpi', { dpi }), color: 'success' })
  }
}

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
      // локализуем по стабильному code (RU-message остаётся фолбэком для прочих мест)
      const code = (err as { code?: string })?.code
      const maxMb = (err as { maxMb?: number })?.maxMb
      const desc = code
        ? t(`customize.upload.errors.${code}`, { maxMb: maxMb ?? MAX_FILE_MB })
        : (err instanceof Error ? err.message : '')
      toast.add({ title: t('customize.upload.rejected'), description: desc, color: 'error' })
      return
    }

    // PDF: растеризуем первую страницу в PNG (для холста и печатного файла),
    // оригинал PDF тоже грузим в Storage — оператор получит векторный исходник.
    if (guard.kind === 'pdf') {
      toast.add({ title: t('customize.upload.pdfProcessing'), color: 'info' })
      const { rasterizePdfFirstPage } = await import('~/utils/pdf-raster')
      let raster: Awaited<ReturnType<typeof rasterizePdfFirstPage>>
      try {
        raster = await rasterizePdfFirstPage(file)
      } catch (err) {
        toast.add({ title: t('customize.upload.pdfFailed'), description: err instanceof Error ? err.message : '', color: 'error' })
        return
      }
      // оригинал PDF — оператору (не критично, если бакет/сеть откажут)
      let pdfUrl: string | undefined
      try { pdfUrl = await uploadToStorage(file, guard.contentType) } catch { /* без оригинала продолжаем */ }
      const pngFile = new File([raster.blob], `${file.name.replace(/\.pdf$/i, '')}.png`, { type: 'image/png' })
      const pngUrl = await uploadToStorage(pngFile, 'image/png')
      // vector=true только если сохранили оригинал PDF (иначе исходник для печати — PNG)
      const pl = addImage(pngUrl, raster.width, raster.height, 'upload', undefined, !!pdfUrl, pdfUrl)
      if (!pl) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
      notifyAdded(pl)
      return
    }

    // HEIC/HEIF (фото iPhone): браузеры не рисуют его на холсте → конвертируем в
    // JPEG на клиенте и дальше работаем как с обычным растром.
    let rasterFile = file
    let rasterContentType = guard.contentType
    if (guard.kind === 'heic') {
      toast.add({ title: t('customize.upload.heicProcessing'), color: 'info' })
      try {
        const heic2any = (await import('heic2any')).default
        const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        const blob = Array.isArray(out) ? out[0]! : out
        rasterFile = new File([blob], `${file.name.replace(/\.(heic|heif)$/i, '')}.jpg`, { type: 'image/jpeg' })
        rasterContentType = 'image/jpeg'
      } catch (err) {
        toast.add({ title: t('customize.upload.heicFailed'), description: err instanceof Error ? err.message : '', color: 'error' })
        return
      }
    }

    const objectUrl = URL.createObjectURL(rasterFile)
    const { w, h } = await readImageSize(objectUrl)
    // DPI больше не блокирует — принимаем любой растр. Оценку качества показываем
    // по реальному размеру на холсте (notifyAdded → dpiOf), а не worst-case.
    // Playwright seed не имеет внешнего Storage: blob URL оставляем живым на время
    // тестовой страницы. В обычном runtime исходник всегда уходит в постоянный bucket.
    const seeded = isE2eSeededCatalog()
    const url = seeded ? objectUrl : await uploadToStorage(rasterFile, rasterContentType)
    if (!seeded) URL.revokeObjectURL(objectUrl)
    const pl = addImage(url, w, h, 'upload')
    if (!pl) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
    notifyAdded(pl)
  } catch {
    toast.add({ title: t('customize.upload.processFailed'), color: 'error' })
  } finally {
    busy.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div>
    <UButton color="primary" icon="i-lucide-upload" :loading="busy" block @click="fileInput?.click()">{{ $t('customize.upload.button') }}</UButton>
    <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFile">
    <p class="text-caption text-ink-gray-400 mt-2">
      {{ $t('customize.upload.hint', { maxMb: MAX_FILE_MB, dpiTarget: DPI_TARGET }) }}
    </p>
  </div>
</template>
