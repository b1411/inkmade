<script setup lang="ts">
import { Image as VImage, Layer as VLayer, Rect as VRect, Stage as VStage, Transformer as VTransformer } from 'vue-konva'
import { GARMENT_VIEWBOX, garmentDataUri, garmentImageRect, type GarmentKind } from '~~/shared/config/garment'
import type { BoundsCanvas } from '~~/shared/config/zones'

// vue-konva больше НЕ регистрируется глобальным плагином (удалён vue-konva.client.ts):
// компоненты <v-stage>/<v-layer>/<v-rect>/<v-image>/<v-transformer> резолвятся из этих
// именованных импортов, как в CustomizerCanvas.client.vue. Без них холст калибровки
// зон рендерился инертными DOM-тегами (Stage не создавался, save отдавал дефолт).

// Визуальный редактор зоны печати (§8.2.1) — калибровка bounds_canvas (миграция 0087).
//
// ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ. Раньше редактор показывал ВЕКТОРНЫЙ СИЛУЭТ и выводил
// миллиметры из прямоугольника через GARMENT_PRINT_FRAME (bodyPx+frameMm). Обе опоры
// оказались негодными: покупателю холст рисует РЕАЛЬНОЕ ФОТО товара (другой кадр,
// другие координаты), а сама связка давала разный масштаб по осям — круг превращался
// в овал на 12%. Админ аккуратно ставил зону, а кастомайзер её выбрасывал: у груди
// футболки выходило 374×468 px по центру холста вместо 122×172 на груди.
//
// Теперь редактор показывает ТО ЖЕ изображение, что увидит покупатель (та же раскладка
// garmentImageRect), и сохраняет прямоугольник прямо в долях холста. Что нарисовал —
// то и правда, переводить нечего.
//
// Физический размер вводится ОТДЕЛЬНО (ширина в мм), а высота выводится из пропорций
// прямоугольника — так масштаб мм↔px по построению одинаков по обеим осям, и овал
// вместо круга стал невозможен в принципе.
const props = defineProps<{
  kind: GarmentKind
  colorHex: string
  /** Фото изделия для этой зоны (перёд/спина). Нет фото — фолбэк на силуэт. */
  photoUrl?: string | null
  boundsCanvas: BoundsCanvas | null
  widthMm: number
}>()
const emit = defineEmits<{ save: [{ bounds_canvas: BoundsCanvas; max_width_mm: number; max_height_mm: number }] }>()

const VB = GARMENT_VIEWBOX
const DISPLAY_W = 320
const s = DISPLAY_W / VB.width

// ── подложка: фото товара, иначе силуэт ──────────────────────────
const photoImg = ref<HTMLImageElement | null>(null)
watch(() => props.photoUrl, (url) => {
  if (!url) { photoImg.value = null; return }
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { photoImg.value = img }
  img.onerror = () => { photoImg.value = null }
  img.src = url
}, { immediate: true })

const garmentImg = ref<HTMLImageElement | null>(null)
watchEffect(() => {
  const img = new window.Image()
  img.onload = () => { garmentImg.value = img }
  img.src = garmentDataUri(props.kind, props.colorHex || '#cccccc')
})

const photoConfig = computed(() => {
  const img = photoImg.value
  if (!img) return null
  return { image: img, ...garmentImageRect(img.width, img.height), listening: false }
})
const garmentConfig = computed(() => (!photoConfig.value && garmentImg.value)
  ? { image: garmentImg.value, x: 0, y: 0, width: VB.width, height: VB.height, listening: false }
  : null)
const bgConfig = { x: 0, y: 0, width: VB.width, height: VB.height, fill: '#efe9df', listening: false }

// ── редактируемый прямоугольник (координаты холста) ──────────────
const rect = reactive({ x: 0, y: 0, width: 0, height: 0 })

// Клампим по холсту, а не по bodyPx: bodyPx — про силуэт, а зона калибруется по фото.
// Верхняя граница нужна ещё и потому, что CHECK в БД требует x+width <= 1.
function clampRect() {
  rect.width = Math.max(12, Math.min(rect.width, VB.width))
  rect.height = Math.max(12, Math.min(rect.height, VB.height))
  rect.x = Math.max(0, Math.min(rect.x, VB.width - rect.width))
  rect.y = Math.max(0, Math.min(rect.y, VB.height - rect.height))
}
function initRect() {
  const b = props.boundsCanvas
  if (b && b.width > 0 && b.height > 0) {
    rect.x = b.x * VB.width
    rect.y = b.y * VB.height
    rect.width = b.width * VB.width
    rect.height = b.height * VB.height
  } else {
    // Неоткалиброванная зона: даём разумную заготовку на груди, а не «во весь холст».
    rect.width = VB.width * 0.26
    rect.height = VB.height * 0.28
    rect.x = (VB.width - rect.width) / 2
    rect.y = VB.height * 0.24
  }
  clampRect()
}
onMounted(initRect)
watch(() => [props.kind, props.boundsCanvas], initRect)

const rectConfig = computed(() => ({
  id: 'zone-rect',
  x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  fill: 'rgba(126,31,45,0.18)', stroke: '#7E1F2D', strokeWidth: 2,
  draggable: true,
  dragBoundFunc: (pos: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(pos.x, VB.width - rect.width)),
    y: Math.max(0, Math.min(pos.y, VB.height - rect.height)),
  }),
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

// ── физический размер ────────────────────────────────────────────
// Ширина — от админа. Высота ВЫВОДИТСЯ из пропорций прямоугольника: вводить её
// руками = дать шанс задать масштаб по осям по-разному, а это и есть та ошибка,
// от которой уходим.
const widthMm = ref(props.widthMm > 0 ? props.widthMm : 200)
watch(() => props.widthMm, v => { if (v > 0) widthMm.value = v })
const heightMm = computed(() => {
  if (!rect.width) return 0
  return Math.round(widthMm.value * (rect.height / rect.width))
})
const pxPerMm = computed(() => (widthMm.value > 0 ? rect.width / widthMm.value : 0))

function onSave() {
  emit('save', {
    bounds_canvas: {
      x: +(rect.x / VB.width).toFixed(4),
      y: +(rect.y / VB.height).toFixed(4),
      width: +(rect.width / VB.width).toFixed(4),
      height: +(rect.height / VB.height).toFixed(4),
    },
    max_width_mm: Math.round(widthMm.value),
    max_height_mm: heightMm.value,
  })
}

// привязка трансформера к прямоугольнику
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stageRef = ref<{ getNode: () => any } | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            <v-image v-if="photoConfig" :config="photoConfig" />
            <v-image v-else-if="garmentConfig" :config="garmentConfig" />
            <v-rect :config="rectConfig" @dragend="onDragEnd" @transformend="onTransformEnd" />
            <v-transformer ref="trRef" :config="{ rotateEnabled: false, borderStroke: '#7E1F2D', anchorStroke: '#7E1F2D', keepRatio: false }" />
          </v-layer>
        </v-stage>
      </div>
    </div>

    <div class="flex-1 space-y-3">
      <p class="text-caption text-ink-gray-600">{{ $t('admin.wizard.zoneEditor.instruction') }}</p>

      <p v-if="!photoConfig" class="text-caption text-ink-warning flex items-start gap-1">
        <UIcon name="i-lucide-triangle-alert" class="size-4 mt-0.5 shrink-0" />
        {{ $t('admin.wizard.zoneEditor.noPhoto') }}
      </p>

      <UFormField :label="$t('admin.wizard.zoneEditor.widthMmLabel')">
        <UInput v-model.number="widthMm" type="number" min="10" max="1000" />
      </UFormField>

      <div class="grid grid-cols-2 gap-3 text-caption">
        <div class="border border-ink-gray-200 rounded-md p-2">
          <span class="text-ink-gray-400 block">{{ $t('admin.wizard.zoneEditor.printSize') }}</span>
          <span class="font-semibold">{{ $t('admin.wizard.zoneEditor.sizeMm', { w: Math.round(widthMm), h: heightMm }) }}</span>
        </div>
        <div class="border border-ink-gray-200 rounded-md p-2">
          <span class="text-ink-gray-400 block">{{ $t('admin.wizard.zoneEditor.scale') }}</span>
          <span class="font-semibold">{{ pxPerMm.toFixed(2) }} px/mm</span>
        </div>
      </div>

      <UButton color="primary" icon="i-lucide-check" block @click="onSave">{{ $t('admin.wizard.zoneEditor.saveZone') }}</UButton>
    </div>
  </div>
</template>

