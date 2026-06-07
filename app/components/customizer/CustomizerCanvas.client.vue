<script setup lang="ts">
import { CANVAS, useDesign } from '~/composables/useDesign'
import type { Placement } from '~/composables/useDesign'

// Холст кастомайзера (§7.1, §7.4). Только клиент (vue-konva plugin .client).
// Нейтральная подложка = цвет изделия (перекраска в реальном времени).
// Принт ограничен границами зоны (§7.1 — нельзя вынести за зону).
const { zoneRect, placements, selectedId, productColorHex, updatePlacement, zone, registerStage } = useDesign()

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

// габариты повёрнутого прямоугольника относительно его origin (left-top, §7.1)
function extentOf(width: number, height: number, rotation: number) {
  const rad = (rotation || 0) * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const pts = [[0, 0], [width, 0], [width, height], [0, height]]
  const xs = pts.map(([cx, cy]) => cx! * cos - cy! * sin)
  const ys = pts.map(([cx, cy]) => cx! * sin + cy! * cos)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

// кламп позиции так, чтобы ПОВЁРНУТЫЙ bbox принта не вышел за зону (§7.1)
function clampPos(x: number, y: number, width: number, height: number, rotation: number) {
  const r = zoneRect.value
  const e = extentOf(width, height, rotation)
  const minX = r.x - e.minX, maxX = r.x + r.width - e.maxX
  const minY = r.y - e.minY, maxY = r.y + r.height - e.maxY
  return {
    x: Math.max(minX, Math.min(x, Math.max(minX, maxX))),
    y: Math.max(minY, Math.min(y, Math.max(minY, maxY))),
  }
}

function makeDragBound(p: Placement) {
  return (pos: { x: number; y: number }) => clampPos(pos.x, pos.y, p.width, p.height, p.rotation)
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
    const width = Math.max(20, node.width() * sx)
    const height = Math.max(8, (p.fontSize ?? 48) * sy) * 1.3
    const pos = clampPos(node.x(), node.y(), width, height, node.rotation())
    updatePlacement(p.id, {
      x: pos.x, y: pos.y, rotation: node.rotation(),
      width, fontSize: Math.max(8, (p.fontSize ?? 48) * sy),
    })
  } else {
    const width = Math.max(10, node.width() * sx)
    const height = Math.max(10, node.height() * sy)
    const pos = clampPos(node.x(), node.y(), width, height, node.rotation())
    updatePlacement(p.id, {
      x: pos.x, y: pos.y, rotation: node.rotation(), width, height,
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
onMounted(() => {
  attachTransformer()
  const stage = stageRef.value?.getNode?.()
  if (stage) registerStage(stage)
})
onBeforeUnmount(() => registerStage(null))
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
