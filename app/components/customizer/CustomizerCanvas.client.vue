<script setup lang="ts">
import Konva from 'konva'
import { CANVAS, useDesign } from '~/composables/useDesign'
import type { Placement } from '~/composables/useDesign'
import { garmentKindForSlug, garmentDataUri, garmentImageRect } from '~~/shared/config/garment'
import { INK_CANVAS, CROP_MARK_LEN, CROP_MARK_GAP } from '~~/shared/config/ink-system'
import { shapeData } from '~/utils/konva-shapes'
import { applyKonvaFilters } from '~/utils/konva-filters'

// Холст кастомайзера (§7.1, §7.4). Только клиент (vue-konva plugin .client).
// Базовый слой — силуэт изделия выбранного цвета (мокап), принт рисуется НА нём
// в активной зоне (§7.1). Слой дизайна КЛИПпируется по зоне (пиксель-точно).
// Мультизона: показываем плейсменты только активной зоны.
const design = useDesign()
const {
  product, zoneRect, placements, activePlacements, selectedId, productColorHex,
  updatePlacement, removePlacement, duplicatePlacement, undo, redo, zone,
  registerStage, registerExporter, registerResetView, pxPerMmForZone, rectForZone,
} = design
const { load: loadFont } = useFontLoader()

const stageRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

const stageConfig = { width: CANVAS.width, height: CANVAS.height }

// ── адаптивность: CSS-scale на узких экранах (геометрия Konva неизменна) ──
const frameRef = ref<HTMLElement | null>(null)
const scale = ref(1)
function recomputeScale() {
  const avail = frameRef.value?.clientWidth ?? CANVAS.width
  scale.value = Math.min(1, avail / CANVAS.width)
}
let ro: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRecompute() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(recomputeScale, 100) // дебаунс: resize стреляет десятки раз/сек
}
onMounted(() => {
  recomputeScale()
  if (typeof ResizeObserver !== 'undefined' && frameRef.value) {
    ro = new ResizeObserver(scheduleRecompute)
    ro.observe(frameRef.value as HTMLElement) // template-ref: приводим к именованному HTMLElement (конфликт CSSOM-типов)
  }
  window.addEventListener('resize', scheduleRecompute)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', scheduleRecompute)
  window.removeEventListener('keydown', onKey)
})

// ── загрузка изображений (мокап + принты) ─────────────────────────
const images = reactive<Record<string, HTMLImageElement>>({})
const tick = ref(0)
function loadImage(key: string, url: string) {
  if (images[key]) return
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { images[key] = img; tick.value++ }
  img.src = url
}
// гарантированная загрузка всех принтов зоны перед экспортом печатного файла
function ensureImagesLoaded(keys: Array<{ id: string; url: string }>): Promise<void> {
  return new Promise((resolve) => {
    const pending = keys.filter(k => !images[k.id])
    if (!pending.length) return resolve()
    let left = pending.length
    const done = () => { if (--left <= 0) resolve() }
    for (const k of pending) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { images[k.id] = img; tick.value++; done() }
      img.onerror = done // битый принт не блокирует — просто не попадёт в файл
      img.src = k.url
    }
  })
}
const mockupUrl = computed(() => zone.value?.mockup_url ?? null)
watchEffect(() => { if (mockupUrl.value) loadImage('__mockup__', mockupUrl.value) })
watchEffect(() => {
  for (const p of placements.value) if (p.kind === 'image' && p.assetUrl) loadImage(p.id, p.assetUrl)
})
const mockupImage = computed(() => { void tick.value; return mockupUrl.value ? images['__mockup__'] : null })

// ── силуэт изделия выбранного цвета ──────────────────────────────
const garmentKind = computed(() => garmentKindForSlug(product.value?.slug ?? product.value?.alias))
const garmentUri = computed(() => garmentDataUri(garmentKind.value, productColorHex.value))
const garmentImg = ref<HTMLImageElement | null>(null)
watch(garmentUri, (uri) => {
  if (!uri) { garmentImg.value = null; return }
  const img = new window.Image()
  img.onload = () => { garmentImg.value = img; tick.value++ }
  img.src = uri
}, { immediate: true })

// ── реальное фото изделия выбранного цвета (приоритет над силуэтом) ──
// Источник — product_images (mockup) выбранного цвета. Перёд/спину выбираем по
// активной зоне. Если фото нет — остаётся векторный силуэт (фолбэк).
const isBackZone = computed(() => /back|спин|зад/.test(`${zone.value?.name ?? ''} ${zone.value?.title ?? ''}`.toLowerCase()))
const productPhotoUrl = computed(() => {
  const imgs = (product.value?.product_images ?? []).filter(
    i => i.kind === 'mockup' && !i.is_hidden && i.color_hex === productColorHex.value,
  )
  if (!imgs.length) return null
  const front = imgs.find(i => /пер[её]д|front/i.test(i.label ?? '')) ?? imgs[0]
  const back = imgs.find(i => /спин|back|зад/i.test(i.label ?? ''))
  return (isBackZone.value ? (back ?? front) : front)?.url ?? null
})
const productPhotoImg = ref<HTMLImageElement | null>(null)
watch(productPhotoUrl, (url) => {
  if (!url) { productPhotoImg.value = null; return }
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { productPhotoImg.value = img; tick.value++ }
  img.onerror = () => { productPhotoImg.value = null; tick.value++ }
  img.src = url
}, { immediate: true })
const productPhotoConfig = computed(() => {
  void tick.value
  const img = productPhotoImg.value
  if (!img) return null
  // Раскладка — из shared/config/garment: по ней же админ калибрует зону в
  // ZoneEditor. Считать cover-fit здесь заново = гарантированно однажды разъехаться.
  return { image: img, ...garmentImageRect(img.width, img.height), listening: false }
})

// ── конфиги слоёв ─────────────────────────────────────────────────
const bgConfig = computed(() => ({ x: 0, y: 0, width: CANVAS.width, height: CANVAS.height, fill: '#efe9df', listening: false }))
const garmentConfig = computed(() => {
  void tick.value
  const img = garmentImg.value
  if (!img) return null
  return { image: img, x: 0, y: 0, width: CANVAS.width, height: CANVAS.height, listening: false }
})
const mockupConfig = computed(() => {
  const img = mockupImage.value
  if (!img) return null
  const sc = Math.min(CANVAS.width / img.width, CANVAS.height / img.height)
  const w = img.width * sc, h = img.height * sc
  return { image: img, x: (CANVAS.width - w) / 2, y: (CANVAS.height - h) / 2, width: w, height: h, opacity: 0.55, listening: false }
})
// ── INK SYSTEM · print zone frame (§36.2) ─────────────────────────
// Рамка зоны печати — фирменный элемент, а не просто подсветка. По §36.2: 1px,
// бордо ТОЛЬКО в selected. Раньше стояло `#7A1F28` жёстко: это старый бордо,
// переживший миграцию палитры, — холст незаметно разъехался с сайтом.
//
// Цвет рамки выбирается по ЦВЕТУ ИЗДЕЛИЯ, а не по фону холста. §36.2 даёт два
// значения (Bone на тёмном / Ink Black 40% на светлом), и подставить одно жёстко
// нельзя: рамка размечает зону НА ткани, а ассортимент — от чёрного до костяного.
// Bone-рамка на белой футболке исчезла бы ровно там, где она нужнее всего.
const isLightGarment = computed(() => {
  const hex = (productColorHex.value || '').replace('#', '')
  if (hex.length !== 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  // Относительная яркость по формуле W3C (восприятие, а не среднее по RGB).
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) > 140
})
const frameStroke = computed(() =>
  selectedId.value
    ? INK_CANVAS.frameSelected
    : isLightGarment.value ? INK_CANVAS.frameOnLight : INK_CANVAS.frameOnDark,
)
const zoneFrameConfig = computed(() => ({
  ...zoneRect.value,
  stroke: frameStroke.value,
  strokeWidth: 1,
  listening: false,
}))

// Угловые метки (§36.2, 8–12px). Ставятся снаружи рамки с зазором — как в реальной
// допечатной подготовке; это и есть «выглядит как production workflow, а не как
// декоративный cyberpunk» (§36.2). Дают рамке узнаваемость без лишнего шума.
const cropMarksConfig = computed(() => {
  const { x, y, width: w, height: h } = zoneRect.value
  const g = CROP_MARK_GAP
  const l = CROP_MARK_LEN
  const line = (points: number[]) => ({ points, stroke: frameStroke.value, strokeWidth: 1, listening: false })
  return [
    line([x - g - l, y, x - g, y]), line([x, y - g - l, x, y - g]),
    line([x + w + g, y, x + w + g + l, y]), line([x + w, y - g - l, x + w, y - g]),
    line([x - g - l, y + h, x - g, y + h]), line([x, y + h + g, x, y + h + g + l]),
    line([x + w + g, y + h, x + w + g + l, y + h]), line([x + w, y + h + g, x + w, y + h + g + l]),
  ]
})
// клиппинг слоя дизайна строго по зоне (§7.1 — принт не выходит за зону, пиксель-точно)
const clipConfig = computed(() => ({ clip: { ...zoneRect.value } }))

// ── смарт-направляющие: привязка к краям/центрам зоны И других объектов ──
const vGuides = ref<number[]>([]) // x-координаты активных вертикальных направляющих
const hGuides = ref<number[]>([])
function clearGuides() { vGuides.value = []; hGuides.value = [] }
function vLineConfig(x: number) {
  const r = zoneRect.value
  return { points: [x, r.y - 10, x, r.y + r.height + 10], stroke: INK_CANVAS.guide, strokeWidth: 1, listening: false }
}
function hLineConfig(y: number) {
  const r = zoneRect.value
  return { points: [r.x - 10, y, r.x + r.width + 10, y], stroke: INK_CANVAS.guide, strokeWidth: 1, listening: false }
}

// ── конфиги элементов ─────────────────────────────────────────────
function imageConfig(p: Placement) {
  void tick.value
  return {
    id: p.id, image: images[p.id], x: p.x, y: p.y, width: p.width, height: p.height,
    rotation: p.rotation, opacity: p.opacity ?? 1, draggable: !p.locked, dragBoundFunc: makeDragBound(p),
  }
}
function patternConfig(p: Placement) {
  void tick.value
  const r = zoneRect.value
  const s = p.patternScale ?? 0.5
  return {
    id: p.id, x: r.x, y: r.y, width: r.width, height: r.height,
    fillPatternImage: images[p.id], fillPatternRepeat: 'repeat',
    fillPatternScale: { x: s, y: s }, opacity: p.opacity ?? 1, listening: true, draggable: false,
  }
}
function shapeConfig(p: Placement) {
  return {
    id: p.id, data: shapeData(p.shapeType ?? 'rect', p.width, p.height), x: p.x, y: p.y,
    fill: p.fill, stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) : 0,
    rotation: p.rotation, opacity: p.opacity ?? 1, draggable: !p.locked, dragBoundFunc: makeDragBound(p),
  }
}
function textConfig(p: Placement) {
  return {
    id: p.id, text: p.text, x: p.x, y: p.y, width: p.width,
    fontSize: p.fontSize, fontFamily: p.fontFamily, fill: p.fill, rotation: p.rotation,
    align: p.align ?? 'center', opacity: p.opacity ?? 1,
    stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) : 0,
    letterSpacing: p.letterSpacing ?? 0, lineHeight: p.lineHeight ?? 1,
    draggable: !p.locked, dragBoundFunc: makeDragBound(p),
  }
}
function arcPath(w: number, c: number): string {
  if (!c) return `M0,0 L${w},0`
  const bend = Math.min(0.98, Math.abs(c) / 100)
  const sagitta = Math.max(1, bend * w * 0.6)
  const r = sagitta / 2 + (w * w) / (8 * sagitta)
  const sweep = c > 0 ? 1 : 0
  return `M0,0 A${r.toFixed(1)},${r.toFixed(1)} 0 0 ${sweep} ${w.toFixed(1)},0`
}
function textPathConfig(p: Placement) {
  return {
    id: p.id, text: p.text, data: arcPath(p.width, p.curve ?? 0), x: p.x, y: p.y,
    fontSize: p.fontSize, fontFamily: p.fontFamily, fill: p.fill, rotation: p.rotation,
    align: p.align ?? 'center', opacity: p.opacity ?? 1,
    stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) : 0,
    letterSpacing: p.letterSpacing ?? 0, draggable: !p.locked, dragBoundFunc: makeDragBound(p),
  }
}
function isCurved(p: Placement) { return p.kind === 'text' && !!p.curve }
function isPattern(p: Placement) { return p.kind === 'image' && !!p.pattern }

// ── клампинг повёрнутого bbox в зону (§7.1) ──────────────────────
function extentOf(width: number, height: number, rotation: number) {
  const rad = (rotation || 0) * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const pts = [[0, 0], [width, 0], [width, height], [0, height]]
  const xs = pts.map(([cx, cy]) => cx! * cos - cy! * sin)
  const ys = pts.map(([cx, cy]) => cx! * sin + cy! * cos)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}
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
// не даём масштабировать элемент больше зоны: AABB повёрнутого bbox не должен
// превышать зону, иначе принт молча кропится при экспорте печатного файла (§13.2).
function fitSizeToZone(width: number, height: number, rotation: number) {
  const r = zoneRect.value
  const e = extentOf(width, height, rotation)
  const aabbW = e.maxX - e.minX, aabbH = e.maxY - e.minY
  const s = Math.min(1, aabbW > 0 ? r.width / aabbW : 1, aabbH > 0 ? r.height / aabbH : 1)
  return { width: width * s, height: height * s, scale: s }
}
const SNAP = 6
function targetsX(excludeId: string): number[] {
  const r = zoneRect.value
  const xs = [r.x, r.x + r.width / 2, r.x + r.width]
  for (const p of activePlacements.value) {
    if (p.id === excludeId) continue
    xs.push(p.x, p.x + p.width / 2, p.x + p.width)
  }
  return xs
}
function targetsY(excludeId: string): number[] {
  const r = zoneRect.value
  const ys = [r.y, r.y + r.height / 2, r.y + r.height]
  for (const p of activePlacements.value) {
    if (p.id === excludeId) continue
    ys.push(p.y, p.y + p.height / 2, p.y + p.height)
  }
  return ys
}
// привязываем левый/центр/правый край элемента к ближайшей цели, рисуем направляющую
function snapAxis(coord: number, size: number, targets: number[]): { coord: number; guide: number | null } {
  for (const off of [0, size / 2, size]) {
    for (const t of targets) {
      if (Math.abs(coord + off - t) < SNAP) return { coord: t - off, guide: t }
    }
  }
  return { coord, guide: null }
}
function snapPos(x: number, y: number, width: number, height: number, id: string) {
  const sx = snapAxis(x, width, targetsX(id))
  const sy = snapAxis(y, height, targetsY(id))
  vGuides.value = sx.guide != null ? [sx.guide] : []
  hGuides.value = sy.guide != null ? [sy.guide] : []
  return { x: sx.coord, y: sy.coord }
}
function makeDragBound(p: Placement) {
  return (pos: { x: number; y: number }) => {
    // pos — абсолютные координаты; при зуме приводим к локальным координатам сцены
    const stage = stageRef.value?.getNode?.()
    const sc = stage?.scaleX?.() ?? 1
    const sp = stage?.position?.() ?? { x: 0, y: 0 }
    const lx = (pos.x - sp.x) / sc, ly = (pos.y - sp.y) / sc
    const s = snapPos(lx, ly, p.width, p.height, p.id)
    const c = clampPos(s.x, s.y, p.width, p.height, p.rotation)
    return { x: c.x * sc + sp.x, y: c.y * sc + sp.y }
  }
}

// ── взаимодействие ────────────────────────────────────────────────
function onStageClick(e: any) {
  if (e.target === e.target.getStage() || !e.target.id?.()) selectedId.value = null
}
function onSelect(id: string) { selectedId.value = id }
function onDragEnd(p: Placement, e: any) {
  clearGuides()
  updatePlacement(p.id, { x: e.target.x(), y: e.target.y() })
}
function onTransformEnd(p: Placement, e: any) {
  const node = e.target
  if (isCurved(p)) { updatePlacement(p.id, { rotation: node.rotation() }); return }
  const sx = node.scaleX(), sy = node.scaleY()
  node.scaleX(1); node.scaleY(1)
  if (p.kind === 'text') {
    const rawFont = Math.max(8, (p.fontSize ?? 48) * sy)
    const rawW = Math.max(20, node.width() * sx)
    const fit = fitSizeToZone(rawW, rawFont * 1.3, node.rotation())
    const fontSize = Math.max(8, rawFont * fit.scale)
    const pos = clampPos(node.x(), node.y(), fit.width, fontSize * 1.3, node.rotation())
    updatePlacement(p.id, { x: pos.x, y: pos.y, rotation: node.rotation(), width: fit.width, fontSize })
  } else {
    const rawW = Math.max(10, node.width() * sx)
    const rawH = Math.max(10, node.height() * sy)
    const fit = fitSizeToZone(rawW, rawH, node.rotation())
    const pos = clampPos(node.x(), node.y(), fit.width, fit.height, node.rotation())
    updatePlacement(p.id, { x: pos.x, y: pos.y, rotation: node.rotation(), width: fit.width, height: fit.height })
  }
}

// ── клавиатура ─────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const el = document.activeElement as HTMLElement | null
  const tag = (el?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return
  const meta = e.ctrlKey || e.metaKey
  const k = e.key.toLowerCase()
  if (meta && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
  if (meta && k === 'y') { e.preventDefault(); redo(); return }
  if (meta && k === 'd') { e.preventDefault(); if (selectedId.value) duplicatePlacement(selectedId.value); return }
  if (!selectedId.value) return
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePlacement(selectedId.value); return }
  const p = placements.value.find(x => x.id === selectedId.value)
  if (!p || p.zone !== zone.value?.name || p.locked) return
  const step = e.shiftKey ? 10 : 1
  let dx = 0, dy = 0
  if (e.key === 'ArrowLeft') dx = -step
  else if (e.key === 'ArrowRight') dx = step
  else if (e.key === 'ArrowUp') dy = -step
  else if (e.key === 'ArrowDown') dy = step
  else return
  e.preventDefault()
  const pos = clampPos(p.x + dx, p.y + dy, p.width, p.height, p.rotation)
  updatePlacement(p.id, pos, !e.repeat)
}

// ── зум и панорамирование сцены (Konva stage.scale) ──────────────
const ZOOM_MIN = 1, ZOOM_MAX = 4
const zoom = ref(1)
function constrainPos(pos: { x: number; y: number }, z: number) {
  const minX = CANVAS.width - CANVAS.width * z
  const minY = CANVAS.height - CANVAS.height * z
  return { x: Math.min(0, Math.max(minX, pos.x)), y: Math.min(0, Math.max(minY, pos.y)) }
}
function applyZoom(newScale: number, center: { x: number; y: number }) {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const old = stage.scaleX() || 1
  const pointTo = { x: (center.x - stage.x()) / old, y: (center.y - stage.y()) / old }
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale))
  stage.scale({ x: z, y: z })
  let pos = { x: center.x - pointTo.x * z, y: center.y - pointTo.y * z }
  if (z <= 1) pos = { x: 0, y: 0 }
  stage.position(constrainPos(pos, z))
  zoom.value = z
  stage.draggable(z > 1)
  stage.batchDraw()
}
function onWheel(e: any) {
  e.evt?.preventDefault?.()
  const stage = stageRef.value?.getNode?.()
  const pointer = stage?.getPointerPosition?.()
  if (!stage || !pointer) return
  const dir = (e.evt?.deltaY ?? 0) > 0 ? -1 : 1
  applyZoom((stage.scaleX() || 1) * (dir > 0 ? 1.12 : 1 / 1.12), pointer)
}
function zoomIn() { applyZoom(zoom.value * 1.25, { x: CANVAS.width / 2, y: CANVAS.height / 2 }) }
function zoomOut() { applyZoom(zoom.value / 1.25, { x: CANVAS.width / 2, y: CANVAS.height / 2 }) }
function zoomReset() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  stage.scale({ x: 1, y: 1 }); stage.position({ x: 0, y: 0 }); stage.draggable(false)
  zoom.value = 1; stage.batchDraw()
}
// pinch-zoom (мобайл)
let lastDist = 0
function onTouchMove(e: any) {
  const t = e.evt?.touches
  if (!t || t.length < 2) return
  e.evt.preventDefault()
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const dist = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY)
  const box = stage.container().getBoundingClientRect()
  const mid = { x: ((t[0].clientX + t[1].clientX) / 2 - box.left) / scale.value, y: ((t[0].clientY + t[1].clientY) / 2 - box.top) / scale.value }
  if (lastDist) applyZoom((stage.scaleX() || 1) * (dist / lastDist), mid)
  lastDist = dist
}
function onTouchEnd() { lastDist = 0 }

// ── фильтры изображений (Konva.Filters требует cache) ─────────────
function applyFilters() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  for (const p of activePlacements.value) {
    if (p.kind !== 'image' || p.pattern) continue
    const node = stage.findOne('#' + p.id)
    if (node) applyKonvaFilters(node, Konva, p.filters)
  }
  stage.batchDraw()
}
// точечный watch: только изменение фильтров/размера/состава изображений (не deep по
// всему массиву) — иначе node.cache() пересчитывался бы при любом перемещении (перф).
const filterSig = computed(() => activePlacements.value
  .filter(p => p.kind === 'image' && !p.pattern)
  .map(p => `${p.id}:${p.width | 0}x${p.height | 0}:${JSON.stringify(p.filters ?? {})}`)
  .join('|'))
watch([filterSig, tick], () => nextTick(applyFilters))

// ── transformer ───────────────────────────────────────────────────
const selectedPlacement = computed(() => placements.value.find(p => p.id === selectedId.value))
const transformerConfig = computed(() => ({
  rotateEnabled: !selectedPlacement.value?.locked,
  borderStroke: '#7A1F28', anchorStroke: '#7A1F28', anchorSize: 12,
  enabledAnchors: (selectedPlacement.value && (isCurved(selectedPlacement.value) || selectedPlacement.value.locked || isPattern(selectedPlacement.value)))
    ? []
    : ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
}))
function attachTransformer() {
  nextTick(() => {
    const stage = stageRef.value?.getNode?.()
    const tr = transformerRef.value?.getNode?.()
    if (!stage || !tr) return
    const sel = selectedPlacement.value
    if (!selectedId.value || sel?.locked || isPattern(sel ?? {} as Placement)) { tr.nodes([]); tr.getLayer()?.batchDraw(); return }
    const node = stage.findOne('#' + selectedId.value)
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  })
}
watch(selectedId, attachTransformer)
watch(() => activePlacements.value.length, () => { attachTransformer(); nextTick(applyFilters) })
// принт-изображение рендерится в Konva только ПОСЛЕ асинхронной загрузки (images[id]).
// В момент addImage ноды ещё нет → трансформер цепляется к пустоте и принт нельзя
// ресайзить. Переподключаемся, когда картинка догрузилась (tick), если выбран
// элемент, но трансформер пока без ноды.
watch(tick, () => {
  if (!selectedId.value) return
  const tr = transformerRef.value?.getNode?.()
  if (tr && tr.nodes().length) return
  attachTransformer()
})
watch(() => zone.value?.name, () => { selectedId.value = null; attachTransformer(); nextTick(applyFilters) })
onMounted(() => {
  attachTransformer()
  nextTick(applyFilters)
  const stage = stageRef.value?.getNode?.()
  if (stage) {
    registerStage(stage)
    stage.dragBoundFunc((pos: { x: number; y: number }) => constrainPos(pos, stage.scaleX() || 1))
    stage.on('touchmove', onTouchMove)
    stage.on('touchend', onTouchEnd)
  }
  registerExporter(exportPrintBlobs)
  registerResetView(zoomReset)
})
onBeforeUnmount(() => { registerStage(null); registerExporter(null); registerResetView(null) })

// ── offscreen-экспорт печатного файла на зону (§13.2, «для печати») ──
// Только слой дизайна, прозрачный фон, целевой DPI, кроп по зоне. Текст
// запекается в растр → у цеха нет проблемы со шрифтами.
const PRINT_CAP_PX = 4096
type ZoneBlob = { zone: string; blob: Blob; w: number; h: number }
async function exportPrintBlobs(dpiRaw = 300): Promise<ZoneBlob[]> {
  const dpi = Math.max(72, Math.min(600, Math.round(dpiRaw))) // защитный кэп
  // гарантируем загрузку шрифтов перед растеризацией текста
  const fonts = [...new Set(placements.value.filter(p => p.kind === 'text' && p.fontFamily).map(p => p.fontFamily!))]
  await Promise.all(fonts.map(f => loadFont(f)))
  try { await (document as any).fonts?.ready } catch { /* noop */ }
  // гарантируем загрузку ВСЕХ принтов — иначе в печатный файл уйдёт пустой слой (§13.2)
  await ensureImagesLoaded(
    placements.value
      .filter(p => p.kind === 'image' && p.assetUrl && !images[p.id])
      .map(p => ({ id: p.id, url: p.assetUrl! })),
  )

  // Печатный файл ОБЯЗАН содержать все размещённые принты. Если ассет так и не
  // загрузился (удалён из Storage / сеть / CORS), НЕ отдаём молча пустой/неполный
  // слой — падаем явно: generatePrintFiles вернёт [], а add-to-cart-гард заблокирует
  // заказ, вместо отправки в цех валидного, но прозрачного PNG (аудит 2026-07-12 #2).
  const failedAssets = placements.value.filter(p => p.kind === 'image' && p.assetUrl && !images[p.id])
  if (failedAssets.length) throw new Error(`print-assets-not-loaded:${failedAssets.length}`)

  const zones = [...new Set(placements.value.map(p => p.zone))]
  const out: ZoneBlob[] = []
  for (const zn of zones) {
    const pls = placements.value.filter(p => p.zone === zn)
    if (!pls.length) continue
    const ppmScreen = pxPerMmForZone(zn) || 1
    // Rect берём из useDesign — ЕДИНСТВЕННЫЙ источник геометрии зоны. Раньше
    // здесь дублировалась формула центрирования (rectX = (CANVAS.width - rectW)/2).
    // С калибровкой bounds_canvas (миграция 0087) она разошлась бы с превью:
    // ширина совпала бы, а кроп поехал по x/y — и в цех ушёл бы не тот кусок макета.
    const { x: rectX, y: rectY, width: rectW, height: rectH } = rectForZone(zn)
    let outScale = (dpi / 25.4) / ppmScreen
    const rawMax = Math.max(rectW * outScale, rectH * outScale)
    if (rawMax > PRINT_CAP_PX) outScale *= PRINT_CAP_PX / rawMax // кэп памяти для больших зон
    const outW = Math.round(rectW * outScale), outH = Math.round(rectH * outScale)
    if (outW < 2 || outH < 2) continue

    const container = document.createElement('div')
    const st = new Konva.Stage({ container, width: outW, height: outH })
    const layer = new Konva.Layer()
    st.add(layer)
    try {
      for (const p of pls) {
        const lx = (p.x - rectX) * outScale, ly = (p.y - rectY) * outScale
        const lw = p.width * outScale, lh = p.height * outScale
        if (p.kind === 'image' && p.pattern && images[p.id]) {
          const s = (p.patternScale ?? 0.5) * outScale
          layer.add(new Konva.Rect({ x: 0, y: 0, width: outW, height: outH, fillPatternImage: images[p.id], fillPatternRepeat: 'repeat', fillPatternScale: { x: s, y: s }, opacity: p.opacity ?? 1 }))
        } else if (p.kind === 'image' && images[p.id]) {
          const node = new Konva.Image({ image: images[p.id], x: lx, y: ly, width: lw, height: lh, rotation: p.rotation, opacity: p.opacity ?? 1 })
          applyKonvaFilters(node, Konva, p.filters)
          layer.add(node)
        } else if (p.kind === 'shape') {
          layer.add(new Konva.Path({ data: shapeData(p.shapeType ?? 'rect', lw, lh), x: lx, y: ly, fill: p.fill, stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) * outScale : 0, rotation: p.rotation, opacity: p.opacity ?? 1 }))
        } else if (p.kind === 'text' && p.curve) {
          layer.add(new Konva.TextPath({ text: p.text ?? '', data: arcPath(lw, p.curve ?? 0), x: lx, y: ly, fontSize: (p.fontSize ?? 48) * outScale, fontFamily: p.fontFamily, fill: p.fill, rotation: p.rotation, align: p.align ?? 'center', opacity: p.opacity ?? 1, stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) * outScale : 0, letterSpacing: (p.letterSpacing ?? 0) * outScale }))
        } else if (p.kind === 'text') {
          layer.add(new Konva.Text({ text: p.text ?? '', x: lx, y: ly, width: lw, fontSize: (p.fontSize ?? 48) * outScale, fontFamily: p.fontFamily, fill: p.fill, rotation: p.rotation, align: p.align ?? 'center', opacity: p.opacity ?? 1, stroke: p.stroke || undefined, strokeWidth: p.stroke ? (p.strokeWidth ?? 0) * outScale : 0, letterSpacing: (p.letterSpacing ?? 0) * outScale, lineHeight: p.lineHeight ?? 1 }))
        }
      }
      // доп. защита: пустой слой (все размещения зоны не отрисовались) → не отдаём
      // прозрачный PNG в цех. В норме недостижимо из-за upfront-проверки ассетов выше.
      if (!layer.getChildren().length) continue
      layer.draw()
      const blob = await new Promise<Blob | null>((resolve) => {
        try { st.toBlob({ mimeType: 'image/png', callback: b => resolve(b as Blob | null) }) } catch { resolve(null) }
      })
      if (blob) out.push({ zone: zn, blob, w: outW, h: outH })
    } finally {
      st.destroy()
    }
  }
  return out
}
</script>

<template>
  <div ref="frameRef" class="relative w-full mx-auto" :style="{ maxWidth: CANVAS.width + 'px', height: (CANVAS.height * scale) + 'px' }">
    <div
      class="rounded-lg overflow-hidden shadow-md bg-ink-white"
      :style="{ width: CANVAS.width + 'px', height: CANVAS.height + 'px', transform: `scale(${scale})`, transformOrigin: 'top left' }"
    >
      <v-stage ref="stageRef" :config="stageConfig" @click="onStageClick" @tap="onStageClick" @wheel="onWheel">
        <v-layer>
          <v-rect :config="bgConfig" />
          <v-image v-if="productPhotoConfig" :config="productPhotoConfig" />
          <v-image v-else-if="garmentConfig" :config="garmentConfig" />
          <v-image v-if="mockupConfig" :config="mockupConfig" />
          <v-rect :config="zoneFrameConfig" />
          <v-line v-for="(m, i) in cropMarksConfig" :key="`crop-${i}`" :config="m" />

          <!-- слой дизайна клиппируется по зоне -->
          <v-group :config="clipConfig">
            <template v-for="p in activePlacements" :key="p.id">
              <v-rect
                v-if="p.kind === 'image' && p.pattern && images[p.id]"
                :config="patternConfig(p)"
                @click="onSelect(p.id)" @tap="onSelect(p.id)"
              />
              <v-image
                v-else-if="p.kind === 'image' && images[p.id]"
                :config="imageConfig(p)"
                @click="onSelect(p.id)" @tap="onSelect(p.id)"
                @dragend="onDragEnd(p, $event)" @transformend="onTransformEnd(p, $event)"
              />
              <v-path
                v-else-if="p.kind === 'shape'"
                :config="shapeConfig(p)"
                @click="onSelect(p.id)" @tap="onSelect(p.id)"
                @dragend="onDragEnd(p, $event)" @transformend="onTransformEnd(p, $event)"
              />
              <v-text-path
                v-else-if="p.kind === 'text' && p.curve"
                :config="textPathConfig(p)"
                @click="onSelect(p.id)" @tap="onSelect(p.id)"
                @dragend="onDragEnd(p, $event)" @transformend="onTransformEnd(p, $event)"
              />
              <v-text
                v-else-if="p.kind === 'text'"
                :config="textConfig(p)"
                @click="onSelect(p.id)" @tap="onSelect(p.id)"
                @dragend="onDragEnd(p, $event)" @transformend="onTransformEnd(p, $event)"
              />
            </template>
          </v-group>

          <v-line v-for="(gx, i) in vGuides" :key="'gv' + i" :config="vLineConfig(gx)" />
          <v-line v-for="(gy, i) in hGuides" :key="'gh' + i" :config="hLineConfig(gy)" />
          <v-transformer ref="transformerRef" :config="transformerConfig" />
        </v-layer>
      </v-stage>
    </div>

    <!-- управление зумом -->
    <div class="absolute bottom-2 right-2 flex flex-col gap-1">
      <UButton size="xs" color="neutral" variant="solid" icon="i-lucide-plus" :title="$t('customize.canvas.zoomIn')" @click="zoomIn" />
      <UButton size="xs" color="neutral" variant="solid" icon="i-lucide-minus" :title="$t('customize.canvas.zoomOut')" @click="zoomOut" />
      <UButton v-if="zoom > 1" size="xs" color="neutral" variant="solid" icon="i-lucide-maximize" :title="$t('customize.canvas.zoomReset')" @click="zoomReset" />
    </div>
  </div>
</template>
