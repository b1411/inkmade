<script setup lang="ts">
import type { ShapeType } from '~/composables/useDesign'

// Базовые фигуры как элементы дизайна (§7.1) — конструктор «с нуля» без своей картинки.
const { addShape } = useDesign()

const SHAPES: Array<{ type: ShapeType; icon: string }> = [
  { type: 'rect', icon: 'i-lucide-square' },
  { type: 'circle', icon: 'i-lucide-circle' },
  { type: 'triangle', icon: 'i-lucide-triangle' },
  { type: 'star', icon: 'i-lucide-star' },
  { type: 'heart', icon: 'i-lucide-heart' },
]
</script>

<template>
  <div>
    <UiSectionLabel>{{ $t('customize.shapes.label') }}</UiSectionLabel>
    <div class="flex flex-wrap gap-2 mt-2">
      <UButton
        v-for="s in SHAPES"
        :key="s.type"
        color="neutral" variant="subtle" size="sm" :icon="s.icon"
        :title="$t(`customize.shapes.${s.type}`)"
        @click="addShape(s.type)"
      />
    </div>
  </div>
</template>
