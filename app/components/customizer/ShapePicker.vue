<script setup lang="ts">
import type { ShapeType } from '~/composables/useDesign'
import { INK_CANVAS } from '~~/shared/config/ink-system'

// Фигуры как элементы дизайна (§7.1): выбор цвета + режим «заливка/контур»,
// затем клик по фигуре добавляет её на активную зону. Линия всегда рисуется штрихом.
const { addShape, atPlacementLimit } = useDesign()
const { t } = useI18n()
const toast = useToast()

const SHAPES: Array<{ type: ShapeType; icon: string }> = [
  { type: 'rect', icon: 'i-lucide-square' },
  { type: 'roundrect', icon: 'i-lucide-squircle' },
  { type: 'circle', icon: 'i-lucide-circle' },
  { type: 'triangle', icon: 'i-lucide-triangle' },
  { type: 'diamond', icon: 'i-lucide-diamond' },
  { type: 'pentagon', icon: 'i-lucide-pentagon' },
  { type: 'hexagon', icon: 'i-lucide-hexagon' },
  { type: 'star', icon: 'i-lucide-star' },
  { type: 'heart', icon: 'i-lucide-heart' },
  { type: 'arrow', icon: 'i-lucide-move-right' },
  { type: 'line', icon: 'i-lucide-minus' },
]

// брендовая палитра + базовые цвета для быстрого выбора
const SWATCHES = [INK_CANVAS.burgundy, '#111111', '#FFFFFF', '#C89A4B', '#2F6F4E', '#2B4C7E', '#B5482E']

const mode = ref<'fill' | 'outline'>('fill')
const color = ref<string>(INK_CANVAS.burgundy)

function add(type: ShapeType) {
  if (atPlacementLimit.value) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
  // линия — всегда штрих (заливка контура нулевой площади невидима)
  if (type === 'line') {
    addShape(type, { fill: 'transparent', stroke: color.value, strokeWidth: 6 })
    return
  }
  if (mode.value === 'outline') {
    addShape(type, { fill: 'transparent', stroke: color.value, strokeWidth: 4 })
  } else {
    addShape(type, { fill: color.value })
  }
}
</script>

<template>
  <div class="space-y-3">
    <UiSectionLabel>{{ $t('customize.shapes.label') }}</UiSectionLabel>

    <!-- режим: заливка / контур -->
    <div class="flex gap-1.5">
      <UButton
        size="xs" :color="mode === 'fill' ? 'primary' : 'neutral'" :variant="mode === 'fill' ? 'solid' : 'subtle'"
        icon="i-lucide-paint-bucket" @click="mode = 'fill'"
      >{{ $t('customize.shapes.fill') }}</UButton>
      <UButton
        size="xs" :color="mode === 'outline' ? 'primary' : 'neutral'" :variant="mode === 'outline' ? 'solid' : 'subtle'"
        icon="i-lucide-pen-line" @click="mode = 'outline'"
      >{{ $t('customize.shapes.outline') }}</UButton>
    </div>

    <!-- цвет: свотчи + свой цвет -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <button
        v-for="c in SWATCHES" :key="c"
        class="size-6 rounded-full border-2 transition-transform hover:scale-110"
        :class="color.toUpperCase() === c ? 'border-ink-burgundy scale-110' : 'border-ink-gray-200'"
        :style="{ backgroundColor: c }"
        :title="c"
        :aria-label="c"
        @click="color = c"
      />
      <label class="relative size-6 rounded-full overflow-hidden border-2 border-ink-gray-200 cursor-pointer" :title="$t('customize.shapes.customColor')">
        <span class="absolute inset-0" style="background: conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)" />
        <input v-model="color" type="color" class="absolute inset-0 opacity-0 cursor-pointer" :aria-label="$t('customize.shapes.customColor')">
      </label>
    </div>

    <!-- сетка фигур -->
    <div class="grid grid-cols-4 gap-1.5">
      <button
        v-for="s in SHAPES" :key="s.type"
        class="aspect-square grid place-items-center rounded-md border border-ink-gray-200 text-ink-gray-700 hover:border-ink-burgundy hover:bg-ink-burgundy/5 hover:text-ink-burgundy transition-colors"
        :title="$t(`customize.shapes.${s.type}`)"
        :aria-label="$t(`customize.shapes.${s.type}`)"
        @click="add(s.type)"
      >
        <UIcon :name="s.icon" class="size-5" />
      </button>
    </div>
  </div>
</template>
