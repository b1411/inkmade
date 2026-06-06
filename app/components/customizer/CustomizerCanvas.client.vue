<script setup lang="ts">
import { CANVAS, useDesign } from '~/composables/useDesign'
import type { Placement } from '~/composables/useDesign'

// Холст кастомайзера (§7.1, §7.4). Только клиент (vue-konva plugin .client).
// Нейтральная подложка = цвет изделия (перекраска в реальном времени).
// Принт ограничен границами зоны (§7.1 — нельзя вынести за зону).
const { zoneRect, placements, selectedId, productColorHex, updatePlacement, zone } = useDesign()

const stageRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

const stageConfig = { width: CANVAS.width, height: CANVAS.height }

// ── загрузка изображений (мокап + принты) ─────────────────────────
const images = reactive<Record<string, HTMLImageElement>>({})
const tick = ref(0) // форсируем перерисовку при onload

function loadImage(key: string, url: string) {
  if (images[key]) return
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { images[key] = img; tick.value++ }
  img.src = url
}

const mockupUrl = computed(() => zone.value?.mockup_url ?? null)
watchEffect(() => { if (mockupUrl.value) loadImage('__mockup__', mockupUrl.value) })
watchEffect(() => {
  for (const p of placements.value) if (p.kind === 'image' && p.assetUrl) loadImage(p.id, p.assetUrl)
})

const mockupImage = computed(() => { void tick.value; return mockupUrl.value ? images['__mockup__'] : null })

// ── конфиги слоёв ─────────────────────────────────────────────────
const bgConfig = computed(() => ({
  x: 0, y: 0, width: CANVAS.width, height: CANVAS.height,
  fill: productColorHex.value, listening: false,
}))

const mockupConfig = computed(() => {
  const img = mockupImage.value
  if (!img) return null
  // вписываем мокап по центру холста (contain)
  const scale = Math.min(CANVAS.width / img.width, CANVAS.height / img.height)
  const w = img.width * scale
  const h = img.height * scale
  return { image: img, x: (CANVAS.width - w) / 2, y: (CANVAS.height - h) / 2, width: w, height: h, opacity: 0.55, listening: false }
})

const zoneFrameConfig = computed(() => ({
  ...zoneRect.value,
  stroke: '#7A1F28', strokeWidth: 1.5, dash: [6, 4], listening: false,
}))

function imageConfig(p: Placement) {
  void tick.value
  return {
    id: p.id, image: images[p.id], x: p.x, y: p.y, width: p.width, height: p.height,
    rotation: p.rotation, draggable: true, dragBoundFunc: makeDragBound(p),
  }
}
function textConfig(p: Placement) {
  return {
    id: p.id, text: p.text, x: p.x, y: p.y, width: p.width,
    fontSize: p.fontSize, fontFamily: p.fontFamily, fill: p.fill, rotation: p.rotation,
    draggable: true, dragBoundFunc: makeDragBound(p),
  }
}

// ограничение перемещения границами зоны (приближённо, по bbox, §7.1)
function makeDragBound(p: Placement) {
  return (pos: { x: number; y: number }) => {
    const r = zoneRect.value
    const maxX = r.x + r.width - p.width
    const maxY = r.y + r.height - p.height
    return {
      x: Math.max(r.x, Math.min(pos.x, Math.max(r.x, maxX))),
      y: Math.max(r.y, Math.min(pos.y, Math.max(r.y, maxY))),
    }
  }
}

// ── взаимодействие ────────────────────────────────────────────────
function onStageClick(e: any) {
  // клик по пустому месту/фону — снять выбор
  if (e.target === e.target.getStage() || !e.target.id?.()) {
    selectedId.value = null
  }
}
function onSelect(id: string) { selectedId.value = id }

function onDragEnd(p: Placement, e: any) {
  updatePlacement(p.id, { x: e.target.x(), y: e.target.y() })
}

function onTransformEnd(p: Placement, e: any) {
  const node = e.target
  const sx = node.scaleX()
  const sy = node.scaleY()
  node.scaleX(1); node.scaleY(1)
  if (p.kind === 'text') {
    updatePlacement(p.id, {
      x: node.x(), y: node.y(), rotation: node.rotation(),
      width: Math.max(20, node.width() * sx),
      fontSize: Math.max(8, (p.fontSize ?? 48) * sy),
    })
  } else {
    updatePlacement(p.id, {
      x: node.x(), y: node.y(), rotation: node.rotation(),
      width: Math.max(10, node.width() * sx),
      height: Math.max(10, node.height() * sy),
    })
  }
}

// ── привязка transformer к выбранному узлу ────────────────────────
function attachTransformer() {
  nextTick(() => {
    const stage = stageRef.value?.getNode?.()
    const tr = transformerRef.value?.getNode?.()
    if (!stage || !tr) return
    if (!selectedId.value) { tr.nodes([]); tr.getLayer()?.batchDraw(); return }
    const node = stage.findOne('#' + selectedId.value)
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  })
}
watch(selectedId, attachTransformer)
watch(() => placements.value.length, attachTransformer)
onMounted(attachTransformer)
</script>

<template>
  <div class="inline-block rounded-lg overflow-hidden shadow-md bg-ink-white">
    <v-stage ref="stageRef" :config="stageConfig" @click="onStageClick" @tap="onStageClick">
      <v-layer>
        <v-rect :config="bgConfig" />
        <v-image v-if="mockupConfig" :config="mockupConfig" />
        <v-rect :config="zoneFrameConfig" />

        <template v-for="p in placements" :key="p.id">
          <v-image
            v-if="p.kind === 'image' && images[p.id]"
            :config="imageConfig(p)"
            @click="onSelect(p.id)"
            @tap="onSelect(p.id)"
            @dragend="onDragEnd(p, $event)"
            @transformend="onTransformEnd(p, $event)"
          />
          <v-text
            v-else-if="p.kind === 'text'"
            :config="textConfig(p)"
            @click="onSelect(p.id)"
            @tap="onSelect(p.id)"
            @dragend="onDragEnd(p, $event)"
            @transformend="onTransformEnd(p, $event)"
          />
        </template>

        <v-transformer ref="transformerRef" :config="{ rotateEnabled: true, borderStroke: '#7A1F28', anchorStroke: '#7A1F28' }" />
      </v-layer>
    </v-stage>
  </div>
</template>
