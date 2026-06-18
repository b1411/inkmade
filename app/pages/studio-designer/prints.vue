<script setup lang="ts">
// Мои принты (CRM §4.2): загрузка, статус модерации, продажи, снятие с публикации.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()
const toast = useToast()
const { t } = useI18n()

const { data: bundle, refresh, pending } = await useAsyncData('designer-prints', async () => {
  const [prints, stats] = await Promise.all([d.myPrints(), d.printStats()])
  return { prints, stats }
})
const prints = computed(() => bundle.value?.prints ?? [])
const stats = computed(() => bundle.value?.stats ?? {})
const money = (n: number) => `${Math.round(n).toLocaleString('ru')} ₸`

const fileInput = ref<HTMLInputElement | null>(null)
const form = reactive({ title: '', tags: '', agree: false })
const uploading = ref(false)
let pickedFile: File | null = null

// порог качества для растровых принтов (§10): меньшая сторона в пикселях.
// Вектор (SVG/PDF) от разрешения не зависит — проверку пропускаем.
const MIN_PX = 1000 // блок: ниже печать будет мыльной даже на малом размере
const OK_PX = 1500 // рекомендация для крупной печати

function isVector(file: File) {
  return file.type === 'image/svg+xml' || file.type === 'application/pdf'
    || /\.(svg|pdf)$/i.test(file.name)
}
function readImageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('studio.designer.prints.toast.readError'))) }
    img.src = url
  })
}

function onPick(e: Event) { pickedFile = (e.target as HTMLInputElement).files?.[0] ?? null }

async function onUpload() {
  if (!form.title.trim()) { toast.add({ title: t('studio.designer.prints.toast.enterName'), color: 'warning' }); return }
  if (!pickedFile) { toast.add({ title: t('studio.designer.prints.toast.chooseFile'), color: 'warning' }); return }
  if (!form.agree) { toast.add({ title: t('studio.designer.prints.toast.confirmRights'), color: 'warning' }); return }

  // DPI-гейт для растра: маленький файл → брак в печати, не пускаем
  if (!isVector(pickedFile)) {
    try {
      const { w, h } = await readImageSize(pickedFile)
      const minSide = Math.min(w, h)
      if (minSide < MIN_PX) {
        toast.add({
          title: t('studio.designer.prints.toast.lowResolution'),
          description: t('studio.designer.prints.toast.lowResolutionDesc', { w, h, min: MIN_PX }),
          color: 'error',
        })
        return
      }
      if (minSide < OK_PX) {
        toast.add({ title: t('studio.designer.prints.toast.borderlineResolution'), description: t('studio.designer.prints.toast.borderlineResolutionDesc', { w, h, ok: OK_PX }), color: 'warning' })
      }
    } catch {
      toast.add({ title: t('studio.designer.prints.toast.checkFailed'), color: 'warning' })
    }
  }

  uploading.value = true
  try {
    const url = await d.uploadPrintFile(pickedFile)
    // лёгкая превью для каталога/модерации (растр → webp); для вектора остаётся оригинал
    let thumbnailUrl: string | null = null
    try {
      const thumb = await makeThumbnail(pickedFile, 400)
      if (thumb) thumbnailUrl = await d.uploadThumbnail(thumb)
    } catch { /* превью не критична — будет оригинал */ }
    await d.createPrint({
      title: form.title.trim(),
      file_url: url,
      thumbnail_url: thumbnailUrl,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
    })
    Object.assign(form, { title: '', tags: '', agree: false })
    pickedFile = null
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
    toast.add({ title: t('studio.designer.prints.toast.submitted'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('studio.designer.prints.toast.uploadError'), description: (e as Error).message, color: 'error' })
  } finally { uploading.value = false }
}

async function toggleActive(id: string, current: boolean) {
  await d.updatePrint(id, { is_active: !current })
  await refresh()
}
const modColor = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning'
const modLabel = computed<Record<string, string>>(() => ({
  pending: t('studio.designer.prints.status.pending'),
  approved: t('studio.designer.prints.status.approved'),
  rejected: t('studio.designer.prints.status.rejected'),
}))
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.designer.prints.label')" :title="$t('studio.designer.prints.title')" :description="$t('studio.designer.prints.description')" />

    <div class="space-y-8">
      <!-- загрузка -->
      <UiPanel :title="$t('studio.designer.prints.uploadTitle')" icon="i-lucide-upload" class="max-w-xl">
        <div class="space-y-3">
          <UInput v-model="form.title" :placeholder="$t('studio.designer.prints.namePlaceholder')" class="w-full" />
          <UInput v-model="form.tags" :placeholder="$t('studio.designer.prints.tagsPlaceholder')" class="w-full" />
          <UButton color="neutral" variant="subtle" icon="i-lucide-file-up" block @click="fileInput?.click()">
            {{ pickedFile ? $t('studio.designer.prints.fileChosen') : $t('studio.designer.prints.chooseFile') }}
          </UButton>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,.pdf" class="hidden" @change="onPick">
          <UCheckbox v-model="form.agree" :label="$t('studio.designer.prints.agree')" />
          <UButton color="primary" size="lg" icon="i-lucide-send" :loading="uploading" @click="onUpload">{{ $t('studio.designer.prints.submit') }}</UButton>
        </div>
      </UiPanel>

      <!-- список -->
      <div>
        <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="aspect-square" />
        </div>
        <UiEmptyState
          v-else-if="!prints?.length"
          icon="i-lucide-image"
          :title="$t('studio.designer.prints.emptyTitle')"
          :text="$t('studio.designer.prints.emptyText')"
        />
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="p in prints" :key="p.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
          <div class="aspect-square bg-ink-gray-200">
            <img v-if="p.thumbnail_url" :src="p.thumbnail_url" :alt="p.title" class="w-full h-full object-contain">
          </div>
          <div class="p-3 space-y-2">
            <p class="text-caption font-semibold truncate">{{ p.title }}</p>
            <UBadge :color="modColor(p.moderation_status)" variant="subtle" size="xs">{{ modLabel[p.moderation_status] }}</UBadge>
            <p v-if="p.moderation_status === 'rejected' && p.moderation_note" class="text-caption text-ink-error">{{ p.moderation_note }}</p>
            <p class="text-caption text-ink-gray-600">
              <i18n-t keypath="studio.designer.prints.salesRoyalty" tag="span" scope="global">
                <template #sales><strong>{{ stats[p.id]?.sales ?? 0 }}</strong></template>
                <template #royalty><strong class="text-ink-success">{{ money(stats[p.id]?.royalty ?? 0) }}</strong></template>
              </i18n-t>
            </p>
            <div class="flex items-center justify-between">
              <span class="text-caption text-ink-gray-500">{{ $t('studio.designer.prints.rate', { rate: p.royalty_pct }) }}</span>
              <UButton size="xs" color="neutral" variant="ghost" @click="toggleActive(p.id, p.is_active)">
                {{ p.is_active ? $t('studio.designer.prints.hide') : $t('studio.designer.prints.show') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
