<script setup lang="ts">
import type { Placement } from '~/composables/useDesign'

// Панель слоёв + инспектор выбранного элемента (§7.1). Управление порядком слоёв,
// дублирование/удаление, тонкая настройка текста (выравнивание/обводка/дуга/прозрачность)
// и удаление фона у растровых принтов (он-девайс, без внешних API).
const { t } = useI18n()
const {
  product, placements, selectedId, zoneName,
  removePlacement, duplicatePlacement, reorder, updatePlacement, replaceImageAsset, alignInZone, sizeCm,
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

function selectLayer(p: Placement) {
  // выбор слоя другой зоны переключает активную зону на его
  if (p.zone !== zoneName.value) zoneName.value = p.zone
  selectedId.value = p.id
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
function setFilter(p: Placement, key: keyof NonNullable<Placement['filters']>, val: number | boolean | undefined) {
  patch(p, { filters: { ...(p.filters ?? {}), [key]: val } })
}
function numFilter(p: Placement, key: 'brightness' | 'contrast' | 'saturation' | 'posterize'): number {
  return p.filters?.[key] ?? 0
}
function resetFilters(p: Placement) { patch(p, { filters: {} }) }

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
    toast.add({ title: t('customize.inspector.bgFailed'), description: (e as Error).message, color: 'error' })
  } finally {
    bgBusy.value = false
  }
}
</script>

<template>
  <div v-if="placements.length" class="space-y-4 border-t border-ink-gray-200 pt-5">
    <UiSectionLabel>{{ $t('customize.layers.label') }}</UiSectionLabel>

    <!-- список слоёв -->
    <ul class="space-y-1">
      <li
        v-for="p in layers"
        :key="p.id"
        class="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors"
        :class="p.id === selectedId ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200 hover:border-ink-gray-400'"
        @click="selectLayer(p)"
      >
        <UIcon :name="layerIcon(p)" class="size-4 shrink-0 text-ink-gray-600" />
        <span class="flex-1 truncate text-caption">{{ layerLabel(p) }}</span>
        <span class="text-[10px] text-ink-gray-400 shrink-0">{{ zoneTitle(p.zone) }}</span>
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
      <!-- размер в см + блокировка -->
      <div class="flex items-center justify-between text-caption text-ink-gray-600">
        <span class="tabular-nums">{{ sizeCm(selected).w }} × {{ sizeCm(selected).h }} {{ $t('customize.inspector.cm') }}</span>
        <button
          class="flex items-center gap-1 hover:text-ink-burgundy"
          :class="selected.locked ? 'text-ink-burgundy' : 'text-ink-gray-400'"
          @click="patch(selected, { locked: !selected.locked })"
        >
          <UIcon :name="selected.locked ? 'i-lucide-lock' : 'i-lucide-lock-open'" class="size-3.5" />
          {{ selected.locked ? $t('customize.inspector.locked') : $t('customize.inspector.lock') }}
        </button>
      </div>

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
          @click="alignInZone(selected.id, a.dir)"
        />
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
        <UInput
          :model-value="selected.text"
          :placeholder="$t('customize.text.placeholder')"
          size="sm" class="w-full"
          @update:model-value="patch(selected, { text: String($event) })"
        />
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
      </template>

      <!-- фигура -->
      <template v-else-if="selected.kind === 'shape'">
        <div class="flex items-center gap-2">
          <span class="text-caption text-ink-gray-600">{{ $t('customize.inspector.fill') }}</span>
          <UInput :model-value="selected.fill" type="color" size="xs" class="w-9 p-0.5" @update:model-value="patch(selected, { fill: String($event) })" />
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
