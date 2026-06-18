<script setup lang="ts">
import { GARMENT_VIEWBOX, GARMENT_PRINT_FRAME, garmentDataUri, type GarmentKind } from '~~/shared/config/garment'
import type { BoundsMm } from '~~/shared/config/zones'

// Визуальный редактор зоны печати (§8.2.1). Админ перетаскивает/масштабирует
// прямоугольник поверх силуэта изделия → bounds_mm (положение) + max_w/h_mm (размер).
// Холст в координатах viewBox (460×540), контейнер масштабируется CSS — так
// dragBoundFunc/координаты Konva остаются в единицах viewBox (как в кастомайзере).
const props = defineProps<{
  kind: GarmentKind
  colorHex: string
  bounds: BoundsMm | null
  maxW: number
  maxH: number
}>()
const emit = defineEmits<{ save: [{ bounds_mm: BoundsMm; max_width_mm: number; max_height_mm: number }] }>()

const VB = GARMENT_VIEWBOX
const DISPLAY_W = 320
const s = DISPLAY_W / VB.width

const frame = computed(() => GARMENT_PRINT_FRAME[props.kind])
const pxPerMmX = computed(() => frame.value.bodyPx.width / frame.value.frameMm.width)
const pxPerMmY = computed(() => frame.value.bodyPx.height / frame.value.frameMm.height)

// силуэт изделия выбранного цвета
const garmentImg = ref<HTMLImageElement | null>(null)
watchEffect(() => {
  const img = new window.Image()
  img.onload = () => { garmentImg.value = img }
  img.src = garmentDataUri(props.kind, props.colorHex || '#cccccc')
})
const garmentConfig = computed(() => garmentImg.value
  ? { image: garmentImg.value, x: 0, y: 0, width: VB.width, height: VB.height, listening: false }
  : null)

const bgConfig = { x: 0, y: 0, width: VB.width, height: VB.height, fill: '#efe9df', listening: false }
const bodyConfig = computed(() => ({ ...frame.value.bodyPx, stroke: '#9a9a9a', strokeWidth: 1, dash: [4, 4], listening: false }))

// редактируемый прямоугольник зоны (координаты viewBox)
const rect = reactive({ x: 0, y: 0, width: 0, height: 0 })
function clampRect() {
  const bp = frame.value.bodyPx
  rect.width = Math.max(20, Math.min(rect.width, bp.width))
  rect.height = Math.max(20, Math.min(rect.height, bp.height))
  rect.x = Math.max(bp.x, Math.min(rect.x, bp.x + bp.width - rect.width))
  rect.y = Math.max(bp.y, Math.min(rect.y, bp.y + bp.height - rect.height))
}
function initRect() {
  const bp = frame.value.bodyPx
  if (props.bounds && props.maxW > 0 && props.maxH > 0) {
    rect.width = props.maxW * pxPerMmX.value
    rect.height = props.maxH * pxPerMmY.value
    rect.x = bp.x + (props.bounds.x || 0) * pxPerMmX.value
    rect.y = bp.y + (props.bounds.y || 0) * pxPerMmY.value
  } else {
    rect.width = bp.width * 0.6
    rect.height = bp.height * 0.5
    rect.x = bp.x + (bp.width - rect.width) / 2
    rect.y = bp.y + (bp.height - rect.height) / 3
  }
  clampRect()
}
onMounted(initRect)
watch(() => [props.kind, props.bounds], initRect)

const rectConfig = computed(() => ({
  id: 'zone-rect',
  x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  fill: 'rgba(122,31,40,0.18)', stroke: '#7A1F28', strokeWidth: 2,
  draggable: true,
  dragBoundFunc: (pos: { x: number; y: number }) => {
    const bp = frame.value.bodyPx
    return {
      x: Math.max(bp.x, Math.min(pos.x, bp.x + bp.width - rect.width)),
      y: Math.max(bp.y, Math.min(pos.y, bp.y + bp.height - rect.height)),
    }
  },
}))

function onDragEnd(e: { target: { x: () => number; y: () => number } }) {
  rect.x = e.target.x()
  rect.y = e.target.y()
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onTransformEnd(e: { target: any }) {
  const node = e.target
  const w = node.width() * node.scaleX()
  const h = node.height() * node.scaleY()
  node.scaleX(1); node.scaleY(1)
  rect.width = w
  rect.height = h
  rect.x = node.x()
  rect.y = node.y()
  clampRect()
}

// мм-вывод (живой)
const mm = computed(() => ({
  w: Math.round(rect.width / pxPerMmX.value),
  h: Math.round(rect.height / pxPerMmY.value),
  x: Math.max(0, Math.round((rect.x - frame.value.bodyPx.x) / pxPerMmX.value)),
  y: Math.max(0, Math.round((rect.y - frame.value.bodyPx.y) / pxPerMmY.value)),
}))

function onSave() {
  emit('save', {
    bounds_mm: { x: mm.value.x, y: mm.value.y, width: mm.value.w, height: mm.value.h },
    max_width_mm: mm.value.w,
    max_height_mm: mm.value.h,
  })
}

// привязка трансформера к прямоугольнику
const stageRef = ref<{ getNode: () => any } | null>(null)
const trRef = ref<{ getNode: () => any } | null>(null)
onMounted(() => nextTick(() => {
  const stage = stageRef.value?.getNode?.()
  const tr = trRef.value?.getNode?.()
  if (!stage || !tr) return
  const node = stage.findOne('#zone-rect')
  if (node) { tr.nodes([node]); tr.getLayer()?.batchDraw() }
}))
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-4">
    <div :style="{ width: DISPLAY_W + 'px', height: (VB.height * s) + 'px' }" class="shrink-0">
      <div
        class="rounded-lg overflow-hidden border border-ink-gray-200"
        :style="{ width: VB.width + 'px', height: VB.height + 'px', transform: `scale(${s})`, transformOrigin: 'top left' }"
      >
        <v-stage ref="stageRef" :config="{ width: VB.width, height: VB.height }">
          <v-layer>
            <v-rect :config="bgConfig" />
            <v-image v-if="garmentConfig" :config="garmentConfig" />
            <v-rect :config="bodyConfig" />
            <v-rect :config="rectConfig" @dragend="onDragEnd" @transformend="onTransformEnd" />
            <v-transformer ref="trRef" :config="{ rotateEnabled: false, borderStroke: '#7A1F28', anchorStroke: '#7A1F28', keepRatio: false }" />
          </v-layer>
        </v-stage>
      </div>
    </div>

    <div class="flex-1 space-y-3">
      <p class="text-caption text-ink-gray-600">{{ $t('admin.wizard.zoneEditor.instruction') }}</p>
      <div class="grid grid-cols-2 gap-3 text-caption">
        <div class="border border-ink-gray-200 rounded-md p-2">
          <span class="text-ink-gray-400 block">{{ $t('admin.wizard.zoneEditor.printSize') }}</span>
          <span class="font-semibold">{{ $t('admin.wizard.zoneEditor.sizeMm', { w: mm.w, h: mm.h }) }}</span>
        </div>
        <div class="border border-ink-gray-200 rounded-md p-2">
          <span class="text-ink-gray-400 block">{{ $t('admin.wizard.zoneEditor.edgeOffset') }}</span>
          <span class="font-semibold">{{ $t('admin.wizard.zoneEditor.offsetMm', { x: mm.x, y: mm.y }) }}</span>
        </div>
      </div>
      <UButton color="primary" icon="i-lucide-check" block @click="onSave">{{ $t('admin.wizard.zoneEditor.saveZone') }}</UButton>
    </div>
  </div>
</template>
