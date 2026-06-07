<script setup lang="ts">
// Мои принты (CRM §4.2): загрузка, статус модерации, продажи, снятие с публикации.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()
const toast = useToast()

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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось прочитать изображение')) }
    img.src = url
  })
}

function onPick(e: Event) { pickedFile = (e.target as HTMLInputElement).files?.[0] ?? null }

async function onUpload() {
  if (!form.title.trim()) { toast.add({ title: 'Введите название', color: 'warning' }); return }
  if (!pickedFile) { toast.add({ title: 'Выберите файл принта', color: 'warning' }); return }
  if (!form.agree) { toast.add({ title: 'Подтвердите права на дизайн', color: 'warning' }); return }

  // DPI-гейт для растра: маленький файл → брак в печати, не пускаем
  if (!isVector(pickedFile)) {
    try {
      const { w, h } = await readImageSize(pickedFile)
      const minSide = Math.min(w, h)
      if (minSide < MIN_PX) {
        toast.add({
          title: 'Слишком низкое разрешение',
          description: `${w}×${h}px — нужно от ${MIN_PX}px по меньшей стороне. Загрузите файл крупнее.`,
          color: 'error',
        })
        return
      }
      if (minSide < OK_PX) {
        toast.add({ title: 'Внимание: разрешение пограничное', description: `${w}×${h}px — подойдёт для мелкой печати, для крупной лучше от ${OK_PX}px.`, color: 'warning' })
      }
    } catch {
      toast.add({ title: 'Не удалось проверить изображение', color: 'warning' })
    }
  }

  uploading.value = true
  try {
    const url = await d.uploadPrintFile(pickedFile)
    await d.createPrint({
      title: form.title.trim(),
      file_url: url,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
    })
    Object.assign(form, { title: '', tags: '', agree: false })
    pickedFile = null
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
    toast.add({ title: 'Принт отправлен на модерацию', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка загрузки', description: (e as Error).message, color: 'error' })
  } finally { uploading.value = false }
}

async function toggleActive(id: string, current: boolean) {
  await d.updatePrint(id, { is_active: !current })
  await refresh()
}
const modColor = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning'
const modLabel: Record<string, string> = { pending: 'На модерации', approved: 'Одобрен', rejected: 'Отклонён' }
</script>

<template>
  <div class="space-y-8">
    <div>
      <UiSectionLabel accent>Каталог</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Мои принты</h1>
    </div>

    <!-- загрузка -->
    <div class="border border-ink-gray-200 rounded-lg p-5 space-y-3 max-w-xl">
      <UiSectionLabel>Загрузить принт</UiSectionLabel>
      <UInput v-model="form.title" placeholder="Название принта" class="w-full" />
      <UInput v-model="form.tags" placeholder="Теги через запятую (стрит, граффити…)" class="w-full" />
      <UButton color="neutral" variant="subtle" icon="i-lucide-upload" @click="fileInput?.click()">
        {{ pickedFile ? 'Файл выбран' : 'Выбрать файл (PNG/SVG, высокое разрешение)' }}
      </UButton>
      <input ref="fileInput" type="file" accept="image/*,.svg,.pdf" class="hidden" @change="onPick">
      <UCheckbox v-model="form.agree" label="Дизайн мой, я отвечаю за авторские права (оферта)" />
      <UButton color="primary" icon="i-lucide-send" :loading="uploading" @click="onUpload">Отправить на модерацию</UButton>
    </div>

    <!-- список -->
    <div>
      <div v-if="pending" class="py-6 text-ink-gray-600">Загрузка…</div>
      <div v-else-if="!prints?.length" class="py-6 text-ink-gray-600 text-caption">Принтов пока нет — загрузите первый выше.</div>
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
              продаж: <strong>{{ stats[p.id]?.sales ?? 0 }}</strong> · роялти: <strong class="text-ink-success">{{ money(stats[p.id]?.royalty ?? 0) }}</strong>
            </p>
            <div class="flex items-center justify-between">
              <span class="text-caption text-ink-gray-500">ставка {{ p.royalty_pct }}%</span>
              <UButton size="xs" color="neutral" variant="ghost" @click="toggleActive(p.id, p.is_active)">
                {{ p.is_active ? 'Скрыть' : 'Показать' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
