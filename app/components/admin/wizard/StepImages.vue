<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Шаг 5 — медиа-менеджер (§8.2.1). Pro-уровень: фото-слоты по цветам/ракурсам/типу,
// drag-and-drop загрузка, переупорядочивание перетаскиванием, скрытие, alt-текст,
// перемещение между цветами и сменa типа — через меню на карточке (AdminMediaCard).
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const { uploadCatalogImage, addImage, updateImage, replaceImageFile, reorderImages, deleteImage, setPrimaryImage } = useAdmin()
const toast = useToast()

type ImageRow = ProductWithRelations['product_images'][number]

const colors = computed(() => {
  const map = new Map<string, string>()
  for (const v of props.product.variants ?? []) map.set(v.color_hex, v.color_name)
  return [...map.entries()].map(([hex, name]) => ({ hex, name }))
})

function mockupsFor(hex: string | null): ImageRow[] {
  return (props.product.product_images ?? [])
    .filter(i => i.kind === 'mockup' && (i.color_hex ?? null) === hex)
    .sort((a, b) => a.sort_order - b.sort_order)
}
// mockup-группы единым списком: цвета вариантов + «общие»
const mockupGroups = computed(() => {
  const g = colors.value.map(c => ({ key: `c-${c.hex}`, title: c.name, hex: c.hex as string | null, images: mockupsFor(c.hex) }))
  g.push({ key: 'common', title: t('admin.wizard.images.commonGroup'), hex: null, images: mockupsFor(null) })
  return g
})
const lifestyle = computed(() =>
  (props.product.product_images ?? [])
    .filter(i => i.kind === 'lifestyle')
    .sort((a, b) => a.sort_order - b.sort_order),
)
const hasPrimary = computed(() => (props.product.product_images ?? []).some(i => i.is_primary))

// ── загрузка (клик + drag-and-drop файлов) ────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingKey = ref<string | null>(null)
let pending: { colorHex: string | null; kind: 'mockup' | 'lifestyle'; key: string } = { colorHex: null, kind: 'mockup', key: '' }
const lifestyleColor = ref<string>('')

function pickClick(colorHex: string | null, kind: 'mockup' | 'lifestyle', key: string) {
  pending = { colorHex, kind, key }
  fileInput.value?.click()
}
async function onInputChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) await uploadFiles(files, pending)
  ;(e.target as HTMLInputElement).value = ''
}
async function uploadFiles(files: FileList, ctx: { colorHex: string | null; kind: 'mockup' | 'lifestyle'; key: string }) {
  uploadingKey.value = ctx.key
  try {
    for (const file of Array.from(files)) {
      const url = await uploadCatalogImage(props.product.id, file)
      await addImage(props.product.id, url, {
        colorHex: ctx.colorHex,
        kind: ctx.kind,
        sortOrder: props.product.product_images.length,
        isPrimary: !hasPrimary.value && ctx.kind === 'mockup',
      })
    }
    emit('changed')
  } catch (err) {
    toast.add({ title: t('admin.wizard.images.uploadError'), description: getFetchMessage(err), color: 'error' })
  } finally {
    uploadingKey.value = null
  }
}

// ── drag-and-drop: загрузка файлов в зону vs переупорядочивание карточек ──
const dragState = ref<{ groupKey: string; id: string } | null>(null)
const dragOverKey = ref<string | null>(null)

function onZoneDragOver(key: string, e: DragEvent) {
  if (dragState.value) return // это reorder, не файлы
  if (e.dataTransfer?.types?.includes('Files')) dragOverKey.value = key
}
async function onZoneDrop(colorHex: string | null, kind: 'mockup' | 'lifestyle', key: string, e: DragEvent) {
  dragOverKey.value = null
  if (dragState.value) return // reorder обработан на карточке
  const files = e.dataTransfer?.files
  if (files?.length) await uploadFiles(files, { colorHex, kind, key })
}

function onCardDragStart(groupKey: string, id: string) { dragState.value = { groupKey, id } }
function onCardDragEnd() { dragState.value = null }
async function onCardDrop(groupKey: string, targetId: string, groupImages: ImageRow[]) {
  const d = dragState.value
  dragState.value = null
  if (!d || d.groupKey !== groupKey || d.id === targetId) return
  const ids = groupImages.map(i => i.id)
  const from = ids.indexOf(d.id)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0) return
  ids.splice(to, 0, ids.splice(from, 1)[0]!)
  try { await reorderImages(ids); emit('changed') } catch (e) {
    toast.add({ title: t('admin.wizard.images.reorderError'), description: getFetchMessage(e), color: 'error' })
  }
}

// ── действия с фото (от MediaCard) ────────────────────────────────
async function run(p: Promise<unknown>) {
  try { await p; emit('changed') } catch (e) {
    toast.add({ title: t('admin.wizard.images.error'), description: getFetchMessage(e), color: 'error' })
  }
}
const onPrimary = (id: string) => run(setPrimaryImage(props.product.id, id))
const onToggleHide = (img: ImageRow) => run(updateImage(img.id, { is_hidden: !img.is_hidden }))
const onLabel = (id: string, value: string) => run(updateImage(id, { label: value.trim() || null }))
const onAlt = (id: string, value: string) => run(updateImage(id, { alt: value.trim() || null }))
const onMoveColor = (id: string, hex: string | null) => run(updateImage(id, { color_hex: hex }))
const onSetKind = (id: string, kind: 'mockup' | 'lifestyle') => run(updateImage(id, { kind }))
const { confirm } = useConfirm()
async function onDelete(id: string) {
  const ok = await confirm({ title: t('admin.wizard.images.deleteConfirm'), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  await run(deleteImage(id))
}

// ── замена файла в слоте ──────────────────────────────────────────
const replaceInput = ref<HTMLInputElement | null>(null)
let replaceId: string | null = null
function startReplace(id: string) { replaceId = id; replaceInput.value?.click() }
async function onReplaceChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f && replaceId) await run(replaceImageFile(props.product.id, replaceId, f))
  replaceId = null
  ;(e.target as HTMLInputElement).value = ''
}

// ── лайтбокс (крупное превью + навигация) ─────────────────────────
const allFlat = computed(() => [...(props.product.product_images ?? [])])
const lightboxIndex = ref<number | null>(null)
const lbImage = computed(() => lightboxIndex.value != null ? allFlat.value[lightboxIndex.value] : null)
function openPreview(id: string) {
  const i = allFlat.value.findIndex(x => x.id === id)
  if (i >= 0) lightboxIndex.value = i
}
function lbStep(d: number) {
  if (lightboxIndex.value == null || !allFlat.value.length) return
  lightboxIndex.value = (lightboxIndex.value + d + allFlat.value.length) % allFlat.value.length
}

// ── массовое выделение ────────────────────────────────────────────
const selectionMode = ref(false)
const selected = ref<Set<string>>(new Set())
function toggleSelect(id: string) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
function exitSelection() { selectionMode.value = false; selected.value = new Set() }
async function bulkHide(hidden: boolean) {
  if (!selected.value.size) return
  await run(Promise.all([...selected.value].map(id => updateImage(id, { is_hidden: hidden }))))
  exitSelection()
}
async function bulkDelete() {
  if (!selected.value.size) return
  const ok = await confirm({ title: t('admin.wizard.images.bulkDeleteConfirm', { count: selected.value.size }), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  await run(Promise.all([...selected.value].map(id => deleteImage(id))))
  exitSelection()
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple class="hidden" @change="onInputChange">
    <input ref="replaceInput" type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="hidden" @change="onReplaceChange">

    <!-- панель управления медиа -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UiSectionLabel>{{ $t('admin.wizard.images.mediaLabel') }}</UiSectionLabel>
      <div v-if="!selectionMode">
        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-check-square" @click="selectionMode = true">{{ $t('admin.wizard.images.select') }}</UButton>
      </div>
      <div v-else class="flex flex-wrap items-center gap-2">
        <span class="text-caption text-ink-gray-600">{{ $t('admin.wizard.images.selected', { count: selected.size }) }}</span>
        <UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-eye-off" :disabled="!selected.size" @click="bulkHide(true)">{{ $t('admin.wizard.images.hide') }}</UButton>
        <UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-eye" :disabled="!selected.size" @click="bulkHide(false)">{{ $t('admin.wizard.images.show') }}</UButton>
        <UButton size="sm" color="error" variant="subtle" icon="i-lucide-trash-2" :disabled="!selected.size" @click="bulkDelete">{{ $t('actions.delete') }}</UButton>
        <UButton size="sm" color="neutral" variant="ghost" @click="exitSelection">{{ $t('admin.wizard.images.done') }}</UButton>
      </div>
    </div>

    <!-- фото изделия по цветам (mockup) -->
    <section>
      <UiSectionLabel accent>{{ $t('admin.wizard.images.colorPhotosTitle') }}</UiSectionLabel>
      <p class="text-caption text-ink-gray-600 mt-1">
        {{ $t('admin.wizard.images.colorPhotosHint') }}
      </p>

      <div class="space-y-6 mt-4">
        <div
          v-for="grp in mockupGroups"
          :key="grp.key"
          class="rounded-lg p-3 -mx-3 transition-colors"
          :class="dragOverKey === grp.key ? 'bg-ink-burgundy/5 ring-2 ring-ink-burgundy/40' : ''"
          @dragover.prevent="onZoneDragOver(grp.key, $event)"
          @dragleave="dragOverKey = null"
          @drop.prevent="onZoneDrop(grp.hex, 'mockup', grp.key, $event)"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="size-5 rounded-full border shrink-0"
              :class="grp.hex ? 'border-ink-gray-200' : 'border-dashed border-ink-gray-400'"
              :style="grp.hex ? { backgroundColor: grp.hex } : {}"
            />
            <span class="font-semibold text-caption">{{ grp.title }}</span>
            <span class="ink-label text-ink-gray-400">{{ $t('admin.wizard.images.photosCount', { count: grp.images.length }) }}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <div
              v-for="img in grp.images"
              :key="img.id"
              draggable="true"
              class="cursor-move"
              @dragstart="onCardDragStart(grp.key, img.id)"
              @dragend="onCardDragEnd"
              @dragover.prevent
              @drop.stop.prevent="onCardDrop(grp.key, img.id, grp.images)"
            >
              <AdminMediaCard
                :image="img"
                :colors="colors"
                :selection-mode="selectionMode"
                :selected="selected.has(img.id)"
                @primary="onPrimary(img.id)"
                @toggle-hide="onToggleHide(img)"
                @delete="onDelete(img.id)"
                @replace="startReplace(img.id)"
                @preview="openPreview(img.id)"
                @toggle-select="toggleSelect(img.id)"
                @update-label="(v: string) => onLabel(img.id, v)"
                @update-alt="(v: string) => onAlt(img.id, v)"
                @move-color="(hex: string | null) => onMoveColor(img.id, hex)"
                @set-kind="(k: 'mockup' | 'lifestyle') => onSetKind(img.id, k)"
              />
            </div>
            <button
              type="button"
              class="aspect-square rounded-md border-2 border-dashed border-ink-gray-200 flex flex-col items-center justify-center gap-1 text-ink-gray-400 hover:border-ink-burgundy hover:text-ink-burgundy transition-colors self-start"
              :disabled="uploadingKey === grp.key"
              @click="pickClick(grp.hex, 'mockup', grp.key)"
            >
              <UIcon :name="uploadingKey === grp.key ? 'i-lucide-loader-circle' : 'i-lucide-plus'" :class="uploadingKey === grp.key ? 'size-5 animate-spin' : 'size-5'" />
              <span class="text-[10px]">{{ $t('admin.wizard.images.angle') }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- на людях (lifestyle) -->
    <section
      class="border-t border-ink-gray-200 pt-6 rounded-lg transition-colors"
      :class="dragOverKey === 'life' ? 'bg-ink-burgundy/5 ring-2 ring-ink-burgundy/40' : ''"
      @dragover.prevent="onZoneDragOver('life', $event)"
      @dragleave="dragOverKey = null"
      @drop.prevent="onZoneDrop(lifestyleColor || null, 'lifestyle', 'life', $event)"
    >
      <UiSectionLabel accent>{{ $t('admin.wizard.images.lifestyleTitle') }}</UiSectionLabel>
      <p class="text-caption text-ink-gray-600 mt-1">
        {{ $t('admin.wizard.images.lifestyleHint') }}
      </p>

      <div class="flex flex-wrap items-center gap-2 mt-3">
        <USelect
          v-model="lifestyleColor"
          :items="[{ label: $t('admin.wizard.images.common'), value: '' }, ...colors.map(c => ({ label: c.name, value: c.hex }))]"
          value-key="value"
          size="sm"
          class="w-52"
        />
        <UButton
          color="neutral" variant="subtle" size="sm" icon="i-lucide-camera"
          :loading="uploadingKey === 'life'"
          @click="pickClick(lifestyleColor || null, 'lifestyle', 'life')"
        >{{ $t('admin.wizard.images.addLifestyle') }}</UButton>
      </div>

      <div v-if="lifestyle.length" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <div
          v-for="img in lifestyle"
          :key="img.id"
          draggable="true"
          class="cursor-move"
          @dragstart="onCardDragStart('life', img.id)"
          @dragend="onCardDragEnd"
          @dragover.prevent
          @drop.stop.prevent="onCardDrop('life', img.id, lifestyle)"
        >
          <AdminMediaCard
            :image="img"
            :colors="colors"
            @primary="onPrimary(img.id)"
            @toggle-hide="onToggleHide(img)"
            @delete="onDelete(img.id)"
            @update-label="(v: string) => onLabel(img.id, v)"
            @update-alt="(v: string) => onAlt(img.id, v)"
            @move-color="(hex: string | null) => onMoveColor(img.id, hex)"
            @set-kind="(k: 'mockup' | 'lifestyle') => onSetKind(img.id, k)"
          />
        </div>
      </div>
      <p v-else class="text-caption text-ink-gray-400 mt-3">{{ $t('admin.wizard.images.lifestyleEmpty') }}</p>
    </section>

    <p v-if="!colors.length" class="text-ink-warning text-caption">
      {{ $t('admin.wizard.images.needColors') }}
    </p>

    <!-- лайтбокс: крупное превью с навигацией -->
    <UModal :open="lbImage !== null" :ui="{ content: 'max-w-3xl' }" @update:open="(v: boolean) => { if (!v) lightboxIndex = null }">
      <template #content>
        <div v-if="lbImage" class="relative bg-ink-black-soft">
          <img :src="lbImage.url" :alt="lbImage.alt ?? ''" class="w-full max-h-[78vh] object-contain">
          <UButton
            icon="i-lucide-chevron-left" color="neutral" variant="solid" size="lg"
            class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
            :aria-label="$t('admin.wizard.images.prev')" @click="lbStep(-1)"
          />
          <UButton
            icon="i-lucide-chevron-right" color="neutral" variant="solid" size="lg"
            class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
            :aria-label="$t('admin.wizard.images.next')" @click="lbStep(1)"
          />
          <UButton
            icon="i-lucide-x" color="neutral" variant="solid" size="sm"
            class="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
            :aria-label="$t('actions.close')" @click="lightboxIndex = null"
          />
          <div class="absolute bottom-0 inset-x-0 p-3 bg-linear-to-t from-black/70 to-transparent text-ink-cream flex items-center gap-2 text-caption">
            <span v-if="lbImage.label" class="ink-label">{{ lbImage.label }}</span>
            <span v-if="lbImage.kind === 'lifestyle'" class="ink-label text-ink-cream/70">{{ $t('admin.wizard.images.lifestyleBadge') }}</span>
            <span v-if="lbImage.is_hidden" class="ink-label text-ink-cream/70">{{ $t('admin.wizard.images.hiddenBadge') }}</span>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
