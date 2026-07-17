<script setup lang="ts">
import type { Placement } from '~/composables/useDesign'
import { DPI_MIN, DPI_TARGET } from '~~/shared/config/zones'
import { PRINT_FONTS } from '~~/shared/config/print-fonts'

// Панель слоёв + инспектор выбранного элемента (§7.1). Управление порядком слоёв,
// дублирование/удаление, тонкая настройка текста (выравнивание/обводка/дуга/прозрачность)
// и удаление фона у растровых принтов (он-девайс, без внешних API).
const { t } = useI18n()

const {
  product, placements, selectedId, selectedIds, zoneName,
  removePlacement, duplicatePlacement, reorder, updatePlacement, replaceImageAsset, alignInZone, alignSelected,
  distributeSelected, selectPlacement, copySelected, pasteSelected, groupSelected, ungroupSelected, sizeCm, dpiOf,
  pxPerMmForZone, rectForZone,
} = useDesign()

const ALIGNS_IN: Array<{ dir: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'; icon: string }> = [
  { dir: 'left', icon: 'i-lucide-align-start-vertical' },
  { dir: 'hcenter', icon: 'i-lucide-align-center-vertical' },
  { dir: 'right', icon: 'i-lucide-align-end-vertical' },
  { dir: 'top', icon: 'i-lucide-align-start-horizontal' },
  { dir: 'vcenter', icon: 'i-lucide-align-center-horizontal' },
  { dir: 'bottom', icon: 'i-lucide-align-end-horizontal' },
]
const toast = useToast()
const supabase = useSupabaseClient()

function zoneTitle(name: string): string {
  return product.value?.print_zones.find(z => z.name === name)?.title ?? name
}

// слои показываем сверху вниз (верхний слой — первым в списке)
const layers = computed(() => [...placements.value].reverse())

const selected = computed<Placement | undefined>(() => placements.value.find(p => p.id === selectedId.value))

// живой DPI выбранного принта на РЕАЛЬНОМ размере (обновляется при ресайзе).
// Не блокирует — только индикатор; цвет подсказывает качество печати.
const selDpi = computed(() => (selected.value ? dpiOf(selected.value) : null))
const dpiTone = computed(() => {
  const d = selDpi.value
  if (d == null) return ''
  if (d < DPI_MIN) return 'bg-ink-error/10 text-ink-error'
  if (d < DPI_TARGET) return 'bg-ink-warning/15 text-ink-warning'
  return 'bg-ink-success/10 text-ink-success'
})

function selectLayer(p: Placement, event?: MouseEvent) {
  // выбор слоя другой зоны переключает активную зону на его
  if (p.zone !== zoneName.value) zoneName.value = p.zone
  selectPlacement(p.id, !!(event?.ctrlKey || event?.metaKey || event?.shiftKey))
}

function layerLabel(p: Placement): string {
  if (p.kind === 'text') return p.text?.trim() || t('customize.layers.textLayer')
  if (p.kind === 'shape') return t(`customize.shapes.${p.shapeType ?? 'rect'}`)
  return p.source === 'library' ? t('customize.layers.libraryPrint') : t('customize.layers.uploadedPrint')
}
function layerIcon(p: Placement): string {
  if (p.kind === 'text') return 'i-lucide-type'
  if (p.kind === 'shape') return 'i-lucide-shapes'
  return 'i-lucide-image'
}

// ── инспектор: правки свойств без записи в историю (не засоряем undo) ──
function patch(p: Placement, patchObj: Partial<Placement>) {
  updatePlacement(p.id, patchObj, false)
}

// смена шрифта у уже размещённого текста (раньше шрифт фиксировался при создании).
const { load: loadFont } = useFontLoader()
const fontItems = PRINT_FONTS.map(f => f.name)
async function setFont(fam: string) {
  const sel = selected.value
  if (!sel || !fam) return
  await loadFont(fam) // грузим шрифт ДО применения, иначе Konva нарисует fallback
  patch(sel, { fontFamily: fam })
}
function setFilter(p: Placement, key: keyof NonNullable<Placement['filters']>, val: number | boolean | undefined) {
  patch(p, { filters: { ...(p.filters ?? {}), [key]: val } })
}
function numFilter(p: Placement, key: 'brightness' | 'contrast' | 'saturation' | 'posterize'): number {
  return p.filters?.[key] ?? 0
}
function resetFilters(p: Placement) { patch(p, { filters: {} }) }

function geometryMm(p: Placement) {
  const ppm = pxPerMmForZone(p.zone) || 1
  const rect = rectForZone(p.zone)
  return {
    x: +((p.x - rect.x) / ppm).toFixed(1),
    y: +((p.y - rect.y) / ppm).toFixed(1),
    width: +(p.width / ppm).toFixed(1),
    height: +(p.height / ppm).toFixed(1),
    rotation: +p.rotation.toFixed(1),
  }
}

function setGeometry(p: Placement, key: 'x' | 'y' | 'width' | 'height' | 'rotation', raw: string | number) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  const ppm = pxPerMmForZone(p.zone) || 1
  const rect = rectForZone(p.zone)
  if (key === 'x') patch(p, { x: rect.x + value * ppm })
  else if (key === 'y') patch(p, { y: rect.y + value * ppm })
  else if (key === 'width') patch(p, { width: Math.max(1, value * ppm) })
  else if (key === 'height') patch(p, { height: Math.max(1, value * ppm) })
  else patch(p, { rotation: value })
}

function setCropZoom(p: Placement, raw: string | number) {
  const zoom = Math.min(0.8, Math.max(0, Number(raw) / 100))
  const size = 1 - zoom
  patch(p, { crop: zoom === 0 ? undefined : { x: (1 - size) / 2, y: (1 - size) / 2, width: size, height: size } })
}

function setCropPosition(p: Placement, axis: 'x' | 'y', raw: string | number) {
  const crop = p.crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const limit = axis === 'x' ? 1 - crop.width : 1 - crop.height
  patch(p, { crop: { ...crop, [axis]: Math.max(0, Math.min(limit, Number(raw) / 100 * limit)) } })
}

const ALIGNS: Array<{ value: NonNullable<Placement['align']>; icon: string }> = [
  { value: 'left', icon: 'i-lucide-align-left' },
  { value: 'center', icon: 'i-lucide-align-center' },
  { value: 'right', icon: 'i-lucide-align-right' },
]

const outlineOn = computed({
  get: () => !!selected.value?.stroke,
  set: (v: boolean) => { if (selected.value) patch(selected.value, { stroke: v ? '#ffffff' : undefined, strokeWidth: v ? 2 : 0 }) },
})

// ── удаление фона у растрового принта (он-девайс) ─────────────────
const bgBusy = ref(false)
function readSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}
async function removeBg(p: Placement) {
  if (!p.assetUrl || bgBusy.value) return
  bgBusy.value = true
  toast.add({ title: t('customize.inspector.bgProcessing'), color: 'info' })
  try {
    // динамический импорт (нестатический спецификатор: не ломает build, если пакета нет)
    const modName = '@imgly/background-removal'
    const mod = await import(/* @vite-ignore */ modName) as { removeBackground: (input: string | Blob) => Promise<Blob> }
    const out = await mod.removeBackground(p.assetUrl)
    const path = `uploads/nobg-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`
    const { error } = await supabase.storage.from('design-uploads').upload(path, out, { contentType: 'image/png' })
    if (error) throw error
    const url = supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
    const objUrl = URL.createObjectURL(out)
    try {
      const dims = await readSize(objUrl)
      replaceImageAsset(p.id, url, dims.w, dims.h)
    } finally {
      URL.revokeObjectURL(objUrl)
    }
    toast.add({ title: t('customize.inspector.bgDone'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('customize.inspector.bgFailed'), description: getFetchMessage(e), color: 'error' })
  } finally {
    bgBusy.value = false
  }
}
</script>

<template>
  <div v-if="placements.length" class="space-y-4 border-t border-ink-gray-200 pt-5">
    <div class="flex items-center justify-between gap-2">
      <UiSectionLabel>{{ $t('customize.layers.label') }}</UiSectionLabel>
      <span v-if="selectedIds.length > 1" class="ink-label text-[10px] text-ink-burgundy">{{ selectedIds.length }} selected</span>
    </div>

    <div class="flex flex-wrap gap-1 border-y border-ink-gray-200 py-2">
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy" :title="$t('customize.layers.copy')" @click="() => { copySelected() }" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-clipboard-paste" :title="$t('customize.layers.paste')" @click="() => { pasteSelected() }" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-group" :disabled="selectedIds.length < 2" :title="$t('customize.layers.group')" @click="() => { groupSelected() }" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-ungroup" :disabled="!selectedIds.length" :title="$t('customize.layers.ungroup')" @click="() => { ungroupSelected() }" />
      <span class="mx-1 h-6 w-px bg-ink-gray-200" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-columns-3" :disabled="selectedIds.length < 3" :title="$t('customize.layers.distributeHorizontal')" @click="distributeSelected('horizontal')" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-rows-3" :disabled="selectedIds.length < 3" :title="$t('customize.layers.distributeVertical')" @click="distributeSelected('vertical')" />
    </div>

    <!-- список слоёв -->
    <ul class="space-y-1">
      <li
        v-for="p in layers"
        :key="p.id"
        class="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors"
        :class="selectedIds.includes(p.id) || p.id === selectedId ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200 hover:border-ink-gray-400'"
        @click="selectLayer(p, $event)"
      >
        <UIcon :name="layerIcon(p)" class="size-4 shrink-0 text-ink-gray-600" />
        <span class="flex-1 truncate text-caption">{{ layerLabel(p) }}</span>
        <span class="text-[10px] text-ink-gray-400 shrink-0">{{ zoneTitle(p.zone) }}</span>
        <button class="text-ink-gray-400 hover:text-ink-burgundy" :title="p.hidden ? $t('customize.layers.show') : $t('customize.layers.hide')" @click.stop="patch(p, { hidden: !p.hidden })">
          <UIcon :name="p.hidden ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
        </button>
        <button class="text-ink-gray-400 hover:text-ink-burgundy" :title="$t('customize.layers.duplicate')" @click.stop="duplicatePlacement(p.id)">
          <UIcon name="i-lucide-copy" class="size-4" />
        </button>
        <button class="text-ink-gray-400 hover:text-ink-error" :title="$t('customize.layers.delete')" @click.stop="removePlacement(p.id)">
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </li>
    </ul>

    <!-- инспектор выбранного элемента -->
    <div v-if="selected" class="space-y-3 rounded-lg bg-ink-gray-50 p-3">
      <!-- размер в см + DPI-индикатор + блокировка -->
      <div class="flex items-center justify-between text-caption text-ink-gray-600">
        <span class="flex items-center gap-1.5">
          <span class="tabular-nums">{{ sizeCm(selected).w }} × {{ sizeCm(selected).h }} {{ $t('customize.inspector.cm') }}</span>
          <span
            v-if="selected.kind === 'image' && selected.vector"
            class="rounded px-1.5 py-0.5 text-[10px] font-medium bg-ink-success/10 text-ink-success"
          >{{ $t('customize.inspector.vector') }}</span>
          <span
            v-else-if="selDpi != null"
            class="rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
            :class="dpiTone"
            :title="selDpi < DPI_MIN ? $t('customize.inspector.dpiLowTitle') : undefined"
          >{{ $t('customize.inspector.dpi', { dpi: selDpi }) }}</span>
        </span>
        <button
          class="flex items-center gap-1 hover:text-ink-burgundy"
          :class="selected.locked ? 'text-ink-burgundy' : 'text-ink-gray-400'"
          @click="patch(selected, { locked: !selected.locked })"
        >
          <UIcon :name="selected.locked ? 'i-lucide-lock' : 'i-lucide-lock-open'" class="size-3.5" />
          {{ selected.locked ? $t('customize.inspector.locked') : $t('customize.inspector.lock') }}
        </button>
      </div>

      <fieldset class="grid grid-cols-2 gap-2 border-t border-ink-gray-200 pt-3">
        <legend class="mb-2 text-caption font-semibold text-ink-gray-600">{{ $t('customize.inspector.geometry') }}</legend>
        <UFormField v-for="field in (['x', 'y', 'width', 'height'] as const)" :key="field" :label="$t(`customize.inspector.${field}Mm`)">
          <UInput
            type="number"
            step="0.1"
            :min="field === 'width' || field === 'height' ? 1 : undefined"
            :model-value="geometryMm(selected)[field]"
            size="xs"
            class="w-full"
            :disabled="selected.locked"
            @update:model-value="setGeometry(selected, field, $event)"
          />
        </UFormField>
        <UFormField :label="$t('customize.inspector.rotationDeg')" class="col-span-2">
          <UInput
            type="number"
            step="1"
            :model-value="geometryMm(selected).rotation"
            size="xs"
            class="w-full"
            :disabled="selected.locked"
            @update:model-value="setGeometry(selected, 'rotation', $event)"
          />
        </UFormField>
      </fieldset>

      <!-- слои + выравнивание -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevrons-up" :title="$t('customize.layers.toFront')" @click="reorder(selected.id, 'front')" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" :title="$t('customize.layers.forward')" @click="reorder(selected.id, 'forward')" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" :title="$t('customize.layers.backward')" @click="reorder(selected.id, 'backward')" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevrons-down" :title="$t('customize.layers.toBack')" @click="reorder(selected.id, 'back')" />
        <span class="w-px h-5 bg-ink-gray-200 mx-1" />
        <UButton
          v-for="a in ALIGNS_IN" :key="a.dir"
          size="xs" color="neutral" variant="ghost" :icon="a.icon"
          :disabled="selected.locked" :title="$t(`customize.inspector.align_${a.dir}`)"
          @click="selectedIds.length > 1 ? alignSelected(a.dir) : alignInZone(selected.id, a.dir)"
        />
      </div>

      <div v-if="selected.kind === 'image'" class="flex items-center gap-2 border-t border-ink-gray-200 pt-3">
        <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.flip') }}</span>
        <UButton size="xs" color="neutral" :variant="selected.flipX ? 'solid' : 'ghost'" icon="i-lucide-flip-horizontal-2" :title="$t('customize.inspector.flipHorizontal')" @click="patch(selected, { flipX: !selected.flipX })" />
        <UButton size="xs" color="neutral" :variant="selected.flipY ? 'solid' : 'ghost'" icon="i-lucide-flip-vertical-2" :title="$t('customize.inspector.flipVertical')" @click="patch(selected, { flipY: !selected.flipY })" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-scan" :title="$t('customize.inspector.cropReset')" @click="patch(selected, { crop: undefined })" />
      </div>

      <div v-if="selected.kind === 'image' && !selected.pattern" class="space-y-2 border-t border-ink-gray-200 pt-3">
        <label class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.cropZoom') }}
          <input
            type="range" min="0" max="80" step="1" class="w-full accent-ink-burgundy"
            :value="selected.crop ? Math.round((1 - Math.min(selected.crop.width, selected.crop.height)) * 100) : 0"
            @input="setCropZoom(selected, ($event.target as HTMLInputElement).value)"
          >
        </label>
        <div v-if="selected.crop" class="grid grid-cols-2 gap-2">
          <label class="block text-caption text-ink-gray-600">
            {{ $t('customize.inspector.cropX') }}
            <input type="range" min="0" max="100" step="1" class="w-full accent-ink-burgundy" :value="selected.crop.x / Math.max(0.001, 1 - selected.crop.width) * 100" @input="setCropPosition(selected, 'x', ($event.target as HTMLInputElement).value)">
          </label>
          <label class="block text-caption text-ink-gray-600">
            {{ $t('customize.inspector.cropY') }}
            <input type="range" min="0" max="100" step="1" class="w-full accent-ink-burgundy" :value="selected.crop.y / Math.max(0.001, 1 - selected.crop.height) * 100" @input="setCropPosition(selected, 'y', ($event.target as HTMLInputElement).value)">
          </label>
        </div>
      </div>

      <!-- прозрачность (общая) -->
      <label class="block text-caption text-ink-gray-600">
        {{ $t('customize.inspector.opacity') }}
        <input
          type="range" min="0.1" max="1" step="0.05" class="w-full accent-ink-burgundy"
          :value="selected.opacity ?? 1"
          @input="patch(selected, { opacity: Number(($event.target as HTMLInputElement).value) })"
        >
      </label>

      <!-- текст -->
      <template v-if="selected.kind === 'text'">
        <UTextarea
          :model-value="selected.text"
          :placeholder="$t('customize.text.placeholder')"
          :rows="2" autoresize size="sm" class="w-full"
          @update:model-value="patch(selected, { text: String($event) })"
        />
        <USelectMenu
          :model-value="selected.fontFamily"
          :items="fontItems"
          :search-input="{ placeholder: $t('customize.text.fontSearch') }"
          size="sm" class="w-full"
          @update:model-value="setFont(String($event))"
        />
        <label class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.fontSize') }}
          <input
            type="range" min="8" max="160" step="1" class="w-full accent-ink-burgundy"
            :value="selected.fontSize ?? 48"
            @input="patch(selected, { fontSize: Number(($event.target as HTMLInputElement).value), height: Number(($event.target as HTMLInputElement).value) * 1.3 })"
          >
        </label>
        <div class="flex items-center gap-2">
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.align') }}</span>
          <UButton
            v-for="a in ALIGNS" :key="a.value"
            size="xs" :icon="a.icon"
            :color="selected.align === a.value ? 'primary' : 'neutral'"
            :variant="selected.align === a.value ? 'solid' : 'ghost'"
            @click="patch(selected, { align: a.value })"
          />
          <span class="ml-auto"><UInput :model-value="selected.fill" type="color" size="xs" class="w-9 p-0.5" @update:model-value="patch(selected, { fill: String($event) })" /></span>
        </div>
        <div class="flex items-center gap-2">
          <USwitch v-model="outlineOn" size="sm" />
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.outline') }}</span>
          <template v-if="outlineOn">
            <UInput :model-value="selected.stroke" type="color" size="xs" class="w-9 p-0.5" @update:model-value="patch(selected, { stroke: String($event) })" />
            <input
              type="range" min="0.5" max="8" step="0.5" class="flex-1 accent-ink-burgundy"
              :value="selected.strokeWidth ?? 2"
              @input="patch(selected, { strokeWidth: Number(($event.target as HTMLInputElement).value) })"
            >
          </template>
        </div>
        <label class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.curve') }}
          <input
            type="range" min="-100" max="100" step="5" class="w-full accent-ink-burgundy"
            :value="selected.curve ?? 0"
            @input="patch(selected, { curve: Number(($event.target as HTMLInputElement).value) })"
          >
        </label>
        <label class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.letterSpacing') }}
          <input
            type="range" min="-5" max="30" step="0.5" class="w-full accent-ink-burgundy"
            :value="selected.letterSpacing ?? 0"
            @input="patch(selected, { letterSpacing: Number(($event.target as HTMLInputElement).value) })"
          >
        </label>
        <label class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.lineHeight') }}
          <input
            type="range" min="0.8" max="2.5" step="0.1" class="w-full accent-ink-burgundy"
            :value="selected.lineHeight ?? 1"
            @input="patch(selected, { lineHeight: Number(($event.target as HTMLInputElement).value) })"
          >
        </label>
      </template>

      <!-- фигура: заливка + контур (обводка) -->
      <template v-else-if="selected.kind === 'shape'">
        <div v-if="selected.shapeType !== 'line'" class="flex items-center gap-2">
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.fill') }}</span>
          <UInput :model-value="selected.fill" type="color" size="xs" class="w-9 p-0.5" @update:model-value="patch(selected, { fill: String($event) })" />
        </div>
        <div class="flex items-center gap-2">
          <USwitch v-model="outlineOn" size="sm" />
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.outline') }}</span>
          <template v-if="outlineOn">
            <UInput :model-value="selected.stroke" type="color" size="xs" class="w-9 p-0.5" @update:model-value="patch(selected, { stroke: String($event) })" />
            <input
              type="range" min="0.5" max="12" step="0.5" class="flex-1 accent-ink-burgundy"
              :value="selected.strokeWidth ?? 2"
              @input="patch(selected, { strokeWidth: Number(($event.target as HTMLInputElement).value) })"
            >
          </template>
        </div>
      </template>

      <!-- картинка -->
      <template v-else>
        <UButton
          v-if="!selected.vector"
          color="neutral" variant="subtle" size="sm" block icon="i-lucide-scissors"
          :loading="bgBusy" @click="removeBg(selected)"
        >
          {{ $t('customize.inspector.removeBg') }}
        </UButton>

        <!-- повтор плиткой (fullprint-паттерн, сублимация) -->
        <div class="flex items-center gap-2">
          <USwitch
            :model-value="!!selected.pattern" size="sm"
            @update:model-value="patch(selected, { pattern: $event })"
          />
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.pattern') }}</span>
        </div>
        <label v-if="selected.pattern" class="block text-caption text-ink-gray-600">
          {{ $t('customize.inspector.patternScale') }}
          <input
            type="range" min="0.1" max="1.5" step="0.05" class="w-full accent-ink-burgundy"
            :value="selected.patternScale ?? 0.5"
            @input="patch(selected, { patternScale: Number(($event.target as HTMLInputElement).value) })"
          >
        </label>

        <!-- фильтры -->
        <template v-if="!selected.vector">
          <div class="flex items-center justify-between">
            <span class="text-caption font-medium text-ink-gray-700">{{ $t('customize.inspector.filters') }}</span>
            <button class="text-[10px] text-ink-gray-400 hover:text-ink-burgundy" @click="resetFilters(selected)">{{ $t('customize.inspector.reset') }}</button>
          </div>
          <label class="block text-caption text-ink-gray-600">{{ $t('customize.inspector.brightness') }}
            <input type="range" min="-0.6" max="0.6" step="0.05" class="w-full accent-ink-burgundy" :value="numFilter(selected, 'brightness')" @input="setFilter(selected, 'brightness', Number(($event.target as HTMLInputElement).value))"></label>
          <label class="block text-caption text-ink-gray-600">{{ $t('customize.inspector.contrast') }}
            <input type="range" min="-60" max="60" step="2" class="w-full accent-ink-burgundy" :value="numFilter(selected, 'contrast')" @input="setFilter(selected, 'contrast', Number(($event.target as HTMLInputElement).value))"></label>
          <label class="block text-caption text-ink-gray-600">{{ $t('customize.inspector.saturation') }}
            <input type="range" min="-2" max="6" step="0.2" class="w-full accent-ink-burgundy" :value="selected.filters?.saturation ?? 0" @input="setFilter(selected, 'saturation', Number(($event.target as HTMLInputElement).value))"></label>
          <label class="block text-caption text-ink-gray-600">{{ $t('customize.inspector.posterize') }}
            <input type="range" min="0" max="1" step="0.05" class="w-full accent-ink-burgundy" :value="numFilter(selected, 'posterize')" @input="setFilter(selected, 'posterize', Number(($event.target as HTMLInputElement).value))"></label>
          <div class="flex flex-wrap gap-1.5">
            <UButton size="xs" :color="selected.filters?.grayscale ? 'primary' : 'neutral'" :variant="selected.filters?.grayscale ? 'solid' : 'ghost'" @click="setFilter(selected, 'grayscale', !selected.filters?.grayscale)">{{ $t('customize.inspector.grayscale') }}</UButton>
            <UButton size="xs" :color="selected.filters?.sepia ? 'primary' : 'neutral'" :variant="selected.filters?.sepia ? 'solid' : 'ghost'" @click="setFilter(selected, 'sepia', !selected.filters?.sepia)">{{ $t('customize.inspector.sepia') }}</UButton>
            <UButton size="xs" :color="selected.filters?.invert ? 'primary' : 'neutral'" :variant="selected.filters?.invert ? 'solid' : 'ghost'" @click="setFilter(selected, 'invert', !selected.filters?.invert)">{{ $t('customize.inspector.invert') }}</UButton>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
