import type { ProductWithRelations, PrintZone, Material } from '~/types/models'
import type { PrintMethod, PrintMode } from '~~/shared/config/print-methods'
import type { BoundsCanvas } from '~~/shared/config/zones'
import { INK_CANVAS } from '~~/shared/config/ink-system'

// Состояние дизайна + спецификация нанесения (§5.2, §7.4).
// Холст работает в px; масштаб мм↔px вычисляется ДИНАМИЧЕСКИ — каждая зона
// вписывается в холст. Каждый плейсмент привязан к СВОЕЙ зоне (мультизона §7.1):
// принт на груди + надпись на спине живут одновременно, редактируется одна
// активная зона. px-координаты плейсмента всегда относятся к rect его зоны,
// а rect зоны — чистая функция от её мм-габаритов и размера холста, поэтому
// смена активной зоны не «ломает» уже расставленные элементы.

export const CANVAS = { width: 460, height: 540 }
const ZONE_PAD = 36 // отступ зоны от краёв холста, px
const HISTORY_LIMIT = 60

export type ShapeType =
  | 'rect' | 'roundrect' | 'circle' | 'triangle' | 'diamond'
  | 'pentagon' | 'hexagon' | 'star' | 'heart' | 'arrow' | 'line'

export interface ImageFilters {
  brightness?: number // -1..1
  contrast?: number // -100..100
  saturation?: number // -2..10 (HSL)
  grayscale?: boolean
  sepia?: boolean
  invert?: boolean
  blur?: number // px
  posterize?: number // 0..1 (уровни постеризации; для спот-превью)
}

export interface Placement {
  id: string
  kind: 'image' | 'text' | 'shape'
  zone: string // машинное имя зоны, к которой привязан элемент (мультизона)
  x: number // px на холсте (левый верх) относительно rect СВОЕЙ зоны
  y: number
  width: number // px
  height: number // px
  rotation: number // градусы
  opacity?: number // 0..1
  locked?: boolean // элемент защищён от перемещения/трансформации
  // image
  source?: 'upload' | 'library' | 'ai'
  assetUrl?: string
  sourceFileUrl?: string // оригинал-исходник для оператора (напр. PDF, из которого отрисован PNG)
  printId?: string // id принта из библиотеки (для атрибуции роялти дизайнеру)
  naturalW?: number // пиксели исходника (для DPI/пропорций)
  naturalH?: number
  vector?: boolean // PDF/SVG-вектор — DPI не применим (сервер пропускает проверку)
  pattern?: boolean // повтор плиткой (fullprint-паттерн, сублимация)
  patternScale?: number // масштаб плитки
  filters?: ImageFilters
  // text
  text?: string
  fontFamily?: string
  fill?: string
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  stroke?: string // цвет обводки
  strokeWidth?: number // px
  letterSpacing?: number
  lineHeight?: number
  curve?: number // -100..100 — изгиб дуги текста (0 = прямой, 100 = полукруг)
  // shape
  shapeType?: ShapeType
}

export interface PrintFile {
  zone: string
  url: string
  w: number
  h: number
  dpi: number
}

export const useDesign = () => {
  const product = useState<ProductWithRelations | null>('design_product', () => null)
  const materialId = useState<string>('design_material', () => '')
  const zoneName = useState<string>('design_zone', () => '')
  const productColorHex = useState<string>('design_color', () => '#111111')
  const placements = useState<Placement[]>('design_placements', () => [])
  const selectedId = useState<string | null>('design_selected', () => null)
  // шелкография: число спот-цветов в макете (влияет на цену §5.5)
  const colorCount = useState<number>('design_color_count', () => 1)

  // ── история (undo/redo) ───────────────────────────────────────
  const past = useState<Placement[][]>('design_past', () => [])
  const future = useState<Placement[][]>('design_future', () => [])
  function commit() {
    past.value = [...past.value.slice(-(HISTORY_LIMIT - 1)), placements.value]
    future.value = []
  }
  function undo() {
    if (!past.value.length) return
    const prev = past.value[past.value.length - 1]!
    future.value = [placements.value, ...future.value]
    past.value = past.value.slice(0, -1)
    placements.value = prev
    selectedId.value = null
  }
  function redo() {
    if (!future.value.length) return
    const next = future.value[0]!
    past.value = [...past.value, placements.value]
    future.value = future.value.slice(1)
    placements.value = next
    selectedId.value = null
  }
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  function resetHistory() { past.value = []; future.value = [] }

  function init(p: ProductWithRelations, opts?: { materialId?: string; colorHex?: string }) {
    product.value = p
    // материал: переданный из карточки товара (если валиден) → первый
    const mId = opts?.materialId && p.materials.some(m => m.id === opts.materialId)
      ? opts.materialId
      : (p.materials[0]?.id ?? '')
    materialId.value = mId
    // активная зона — первая ВАЛИДНАЯ для режима выбранного материала (а не слепо [0]):
    // иначе на мультиматериальном товаре рамка зоны и zoneName рассинхронятся.
    const mode = (p.materials.find(m => m.id === mId)?.print_mode as PrintMode) ?? 'zonal'
    zoneName.value = (p.print_zones.find(z => z.print_mode === mode) ?? p.print_zones[0])?.name ?? ''
    // дефолтный цвет: переданный из карточки (если В НАЛИЧИИ) → первый в наличии → первый
    // (скрытые stock=0 игнорируем, иначе холст стартовал бы в недоступном цвете)
    const wantColor = opts?.colorHex && p.variants.some(v => v.color_hex === opts.colorHex && v.stock > 0)
      ? opts.colorHex
      : null
    productColorHex.value = wantColor ?? (p.variants.find(v => v.stock > 0) ?? p.variants[0])?.color_hex ?? '#111111'
    placements.value = []
    selectedId.value = null
    colorCount.value = 1
    printFiles.value = []
    resetHistory()
  }

  const material = computed<Material | undefined>(() =>
    product.value?.materials.find(m => m.id === materialId.value),
  )

  const printMode = computed<PrintMode>(() => (material.value?.print_mode as PrintMode) ?? 'zonal')

  // зоны, валидные для режима текущего материала (§5.2.1)
  const validZones = computed<PrintZone[]>(() =>
    (product.value?.print_zones ?? []).filter(z => z.print_mode === printMode.value),
  )

  const zone = computed<PrintZone | undefined>(() =>
    validZones.value.find(z => z.name === zoneName.value) ?? validZones.value[0],
  )

  function zoneByName(name: string): PrintZone | undefined {
    return (product.value?.print_zones ?? []).find(z => z.name === name)
  }

  // ── геометрия per-zone ──────────────────────────────────────────
  // Основной путь — калибровка bounds_canvas (миграция 0087): прямоугольник зоны
  // задан прямо в долях холста, поэтому положение и размер берутся как есть.
  //
  // Фолбэк ниже — прежняя формула «вписать зону в холст и отцентрировать». Она
  // рисует зону НЕ ТАМ и втрое крупнее (у груди футболки 374×468 px вместо
  // 122×172), потому что не знает, где на картинке изделие. Держим её только для
  // неоткалиброванных зон: убрать сейчас = сломать превью там, где калибровки ещё
  // нет. Каждая заполненная bounds_canvas выводит одну зону из-под фолбэка.
  //
  // Печатный файл в обоих случаях считается верно: exportPrintBlobs переводит
  // экранные px в мм через pxPerMmForZone, то есть через ту же шкалу, что и rect.
  // Врало именно превью — цифры в цех уходили правильные.
  function dimsOf(z?: PrintZone) {
    return { wmm: Number(z?.max_width_mm) || 200, hmm: Number(z?.max_height_mm) || 250 }
  }

  function canvasBoundsOf(z?: PrintZone): BoundsCanvas | null {
    const b = z?.bounds_canvas as BoundsCanvas | null | undefined
    if (!b || typeof b.width !== 'number' || typeof b.height !== 'number') return null
    if (!(b.width > 0) || !(b.height > 0)) return null
    return b
  }

  function rectFor(z?: PrintZone) {
    const b = canvasBoundsOf(z)
    if (b) {
      return {
        x: b.x * CANVAS.width,
        y: b.y * CANVAS.height,
        width: b.width * CANVAS.width,
        height: b.height * CANVAS.height,
      }
    }
    const { wmm, hmm } = dimsOf(z)
    const ppm = pxPerMmFor(z)
    return {
      x: (CANVAS.width - wmm * ppm) / 2,
      y: (CANVAS.height - hmm * ppm) / 2,
      width: wmm * ppm,
      height: hmm * ppm,
    }
  }

  // Масштаб мм↔px. У откалиброванной зоны он ВЫВОДИТСЯ из её же ширины, поэтому
  // единый по обеим осям по построению: круг на экране остаётся кругом в печати.
  // (В старой связке bodyPx 220×330 под frameMm 360×480 масштабы по осям
  // расходились на 12% — овал вместо круга.)
  function pxPerMmFor(z?: PrintZone): number {
    const b = canvasBoundsOf(z)
    if (b) {
      const { wmm } = dimsOf(z)
      return (b.width * CANVAS.width) / wmm
    }
    const { wmm, hmm } = dimsOf(z)
    return Math.min((CANVAS.width - ZONE_PAD * 2) / wmm, (CANVAS.height - ZONE_PAD * 2) / hmm)
  }

  function pxPerMmForZone(name: string): number { return pxPerMmFor(zoneByName(name)) }
  /**
   * Rect зоны по имени — для экспорта печатного файла. Экспорт ОБЯЗАН брать rect
   * отсюда, а не считать его сам: раньше он дублировал формулу центрирования, и
   * с приходом bounds_canvas это разошлось бы с превью — совпала бы только
   * ширина, а кроп поехал бы по x/y, то есть в цех ушёл бы не тот кусок макета.
   */
  function rectForZone(name: string) { return rectFor(zoneByName(name)) }

  // активная зона
  const pxPerMm = computed(() => pxPerMmFor(zone.value))
  const zoneRect = computed(() => rectFor(zone.value))

  // при смене режима печати: если активная/существующие зоны несовместимы —
  // переключаем активную зону и сбрасываем плейсменты другого режима (один
  // order_item = один метод = один режим, смешивать нельзя §5.2.1).
  watch(printMode, () => {
    if (!validZones.value.find(z => z.name === zoneName.value)) {
      zoneName.value = validZones.value[0]?.name ?? ''
    }
    const validNames = new Set(validZones.value.map(z => z.name))
    if (placements.value.some(p => !validNames.has(p.zone))) {
      const kept = placements.value.filter(p => validNames.has(p.zone))
      if (kept.length !== placements.value.length) {
        commit()
        placements.value = kept
        selectedId.value = null
      }
    }
  })

  // плейсменты активной зоны (для рендера/редактирования)
  const activePlacements = computed(() => placements.value.filter(p => p.zone === zoneName.value))
  // имена зон, в которых что-то расставлено (для индикаторов в ZoneSelector)
  const zonesWithPlacements = computed(() => new Set(placements.value.map(p => p.zone)))

  // ── элементы ──────────────────────────────────────────────────
  let seq = 0
  function nextId() { return `pl_${Date.now()}_${seq++}` }

  // Серверный предел — designSpecSchema.placements.max(20). Дублируем на клиенте, чтобы
  // не дать собрать >20 элементов и упереться в ошибку только на checkout (аудит 2026-07-12).
  const MAX_PLACEMENTS = 20
  const atPlacementLimit = computed(() => placements.value.length >= MAX_PLACEMENTS)

  function addImage(assetUrl: string, naturalW: number, naturalH: number, source: 'upload' | 'library' | 'ai', printId?: string, vector = false, sourceFileUrl?: string): Placement | null {
    if (placements.value.length >= MAX_PLACEMENTS) return null
    const r = zoneRect.value
    // защита от деления на ноль: некорректные размеры → 1:1 квадрат (иначе NaN-геометрия)
    const nW = naturalW > 0 ? naturalW : 1
    const nH = naturalH > 0 ? naturalH : 1
    // вписываем в зону, сохраняя пропорции, до 70% ширины зоны
    const targetW = r.width * 0.7
    const scale = targetW / nW
    const w = targetW
    const h = nH * scale
    // если по высоте не влезает — пересчитываем от высоты, сохраняя пропорции
    const fitScale = h > r.height ? r.height / h : 1
    const fw = w * fitScale
    const fh = h * fitScale
    const pl: Placement = {
      id: nextId(), kind: 'image', zone: zoneName.value, source, assetUrl, sourceFileUrl, printId, naturalW, naturalH, vector,
      x: r.x + (r.width - fw) / 2,
      y: r.y + (r.height - fh) / 2,
      width: fw, height: fh, rotation: 0, opacity: 1,
    }
    commit()
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
    return pl
  }

  // Эффективный DPI плейсмента на РЕАЛЬНОМ размере на холсте (а не на макс. размере
  // изделия). Для индикатора качества в инспекторе/тосте — обновляется при ресайзе.
  // null = не растровая картинка (вектор/текст/фигура) либо нет данных о пикселях.
  function dpiOf(p: Placement): number | null {
    if (p.kind !== 'image' || p.vector || !p.naturalW || !p.naturalH) return null
    const ppm = pxPerMmForZone(p.zone) || 1
    const widthMm = p.width / ppm
    const heightMm = p.height / ppm
    if (widthMm <= 0 || heightMm <= 0) return null
    const dpiX = (p.naturalW / widthMm) * 25.4
    const dpiY = (p.naturalH / heightMm) * 25.4
    return Math.floor(Math.min(dpiX, dpiY))
  }

  function addText(text: string, fontFamily: string, fill: string, fontSize = 48, opts: Partial<Placement> = {}) {
    if (placements.value.length >= MAX_PLACEMENTS) return
    const r = zoneRect.value
    const pl: Placement = {
      id: nextId(), kind: 'text', zone: zoneName.value, text, fontFamily, fill, fontSize,
      align: 'center', opacity: 1,
      x: r.x + r.width * 0.1,
      y: r.y + r.height * 0.4,
      width: r.width * 0.8, height: fontSize * 1.3, rotation: 0,
      ...opts,
    }
    commit()
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
  }

  function addShape(shapeType: ShapeType, opts?: { fill?: string; stroke?: string; strokeWidth?: number }) {
    if (placements.value.length >= MAX_PLACEMENTS) return
    const r = zoneRect.value
    const side = Math.min(r.width, r.height) * 0.4
    const pl: Placement = {
      id: nextId(), kind: 'shape', zone: zoneName.value, shapeType,
      fill: opts?.fill ?? INK_CANVAS.burgundy, stroke: opts?.stroke, strokeWidth: opts?.strokeWidth, opacity: 1,
      x: r.x + (r.width - side) / 2,
      y: r.y + (r.height - side) / 2,
      width: side, height: shapeType === 'line' ? Math.max(6, side * 0.06) : side, rotation: 0,
    }
    commit()
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
  }

  // ── загрузка существующего дизайна для «доработать» (§3.1) ─────
  // Реконструирует состояние из spec: КАЖДЫЙ плейсмент конвертируется мм→px по
  // rect СВОЕЙ зоны (мультизона). Приблизительно: fontSize выводим из высоты.
  interface SpecPlacementIn {
    zone?: string; kind?: string; x_mm?: number; y_mm?: number; width_mm?: number; height_mm?: number
    rotation_deg?: number; source?: string; text?: string; font?: string; fill?: string
    asset_url?: string; source_file_url?: string; natural_w?: number; natural_h?: number; vector?: boolean; opacity?: number
    align?: string; stroke?: string; stroke_width?: number; letter_spacing?: number; line_height?: number; curve?: number
    shape_type?: string; pattern?: boolean; pattern_scale?: number; filters?: ImageFilters; locked?: boolean
  }
  interface SpecIn {
    placements?: SpecPlacementIn[]; product_color_hex?: string
    material?: string; print_method?: string; print_id?: string | null; color_count?: number
  }
  function loadSpec(raw: unknown) {
    const spec = raw as SpecIn | null
    if (!product.value || !spec) return
    // материал: по методу печати → по ткани → первый
    const mat = product.value.materials.find(m => m.print_method === spec.print_method)
      ?? product.value.materials.find(m => m.fabric_type === spec.material)
      ?? product.value.materials[0]
    if (mat) materialId.value = mat.id
    if (spec.product_color_hex) productColorHex.value = spec.product_color_hex
    if (spec.color_count) colorCount.value = spec.color_count
    printFiles.value = []

    const next: Placement[] = []
    let firstValidZone = ''
    for (const p of spec.placements ?? []) {
      const zn = p.zone || validZones.value[0]?.name || ''
      const z = zoneByName(zn)
      const r = rectFor(z)
      const ppm = pxPerMmFor(z)
      const width = (Number(p.width_mm) || 0) * ppm
      const height = (Number(p.height_mm) || 0) * ppm
      const x = r.x + (Number(p.x_mm) || 0) * ppm
      const y = r.y + (Number(p.y_mm) || 0) * ppm
      const rotation = Number(p.rotation_deg) || 0
      if (!firstValidZone && validZones.value.find(v => v.name === zn)) firstValidZone = zn
      if (p.kind === 'shape' || p.source === 'shape') {
        next.push({
          id: nextId(), kind: 'shape', zone: zn, x, y, width, height, rotation,
          shapeType: (p.shape_type as ShapeType) ?? 'rect', fill: p.fill ?? INK_CANVAS.burgundy,
          stroke: p.stroke, strokeWidth: p.stroke_width, opacity: p.opacity ?? 1, locked: p.locked,
        })
      } else if (p.source === 'text') {
        next.push({
          id: nextId(), kind: 'text', zone: zn, x, y, width, height, rotation,
          text: p.text ?? '', fontFamily: p.font ?? 'Inter', fill: p.fill ?? '#111111',
          fontSize: Math.max(8, Math.round(height / 1.3)),
          align: (p.align as Placement['align']) ?? 'center',
          stroke: p.stroke, strokeWidth: p.stroke_width, letterSpacing: p.letter_spacing,
          lineHeight: p.line_height, curve: p.curve, opacity: p.opacity ?? 1, locked: p.locked,
        })
      } else if (p.asset_url) {
        next.push({
          id: nextId(), kind: 'image', zone: zn, x, y, width, height, rotation,
          source: p.source === 'library' ? 'library' : 'upload',
          assetUrl: p.asset_url, sourceFileUrl: p.source_file_url, vector: !!p.vector, opacity: p.opacity ?? 1,
          pattern: p.pattern, patternScale: p.pattern_scale, filters: p.filters, locked: p.locked,
          printId: p.source === 'library' ? (spec.print_id ?? undefined) : undefined,
          naturalW: p.natural_w, naturalH: p.natural_h,
        })
      }
    }
    if (firstValidZone) zoneName.value = firstValidZone
    placements.value = next
    selectedId.value = null
    resetHistory()
  }

  function updatePlacement(id: string, patch: Partial<Placement>, record = true) {
    if (record) commit()
    placements.value = placements.value.map(p => (p.id === id ? { ...p, ...patch } : p))
  }

  function removePlacement(id: string) {
    commit()
    placements.value = placements.value.filter(p => p.id !== id)
    if (selectedId.value === id) selectedId.value = null
  }

  function duplicatePlacement(id: string) {
    const p = placements.value.find(x => x.id === id)
    if (!p) return
    commit()
    const np: Placement = { ...p, id: nextId(), x: p.x + 14, y: p.y + 14 }
    placements.value = [...placements.value, np]
    selectedId.value = np.id
  }

  // переупорядочивание слоёв (порядок в массиве = порядок отрисовки, позже = выше)
  function reorder(id: string, dir: 'front' | 'back' | 'forward' | 'backward') {
    const arr = [...placements.value]
    const i = arr.findIndex(p => p.id === id)
    if (i < 0) return
    commit()
    const [pl] = arr.splice(i, 1)
    if (dir === 'front') arr.push(pl!)
    else if (dir === 'back') arr.unshift(pl!)
    else if (dir === 'forward') arr.splice(Math.min(arr.length, i + 1), 0, pl!)
    else arr.splice(Math.max(0, i - 1), 0, pl!)
    placements.value = arr
  }

  // выравнивание элемента в пределах его зоны (§7.1)
  type AlignDir = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
  function alignInZone(id: string, dir: AlignDir) {
    const p = placements.value.find(x => x.id === id)
    if (!p) return
    const r = rectFor(zoneByName(p.zone))
    const patch: Partial<Placement> = {}
    if (dir === 'left') patch.x = r.x
    else if (dir === 'hcenter') patch.x = r.x + (r.width - p.width) / 2
    else if (dir === 'right') patch.x = r.x + r.width - p.width
    else if (dir === 'top') patch.y = r.y
    else if (dir === 'vcenter') patch.y = r.y + (r.height - p.height) / 2
    else if (dir === 'bottom') patch.y = r.y + r.height - p.height
    commit()
    placements.value = placements.value.map(x => (x.id === id ? { ...x, ...patch } : x))
  }

  // размер элемента в сантиметрах (для подписи в инспекторе)
  function sizeCm(p: Placement): { w: number; h: number } {
    const ppm = pxPerMmFor(zoneByName(p.zone)) || 1
    return { w: +(p.width / ppm / 10).toFixed(1), h: +(p.height / ppm / 10).toFixed(1) }
  }

  // замена картинки (например после удаления фона) — сохраняем геометрию
  function replaceImageAsset(id: string, assetUrl: string, naturalW: number, naturalH: number) {
    commit()
    placements.value = placements.value.map(p =>
      p.id === id ? { ...p, assetUrl, naturalW, naturalH, vector: false } : p,
    )
  }

  const hasText = computed(() => placements.value.some(p => p.kind === 'text'))

  // ── px ↔ мм относительно активной зоны (§7.4) ─────────────────
  function toMm(px: number) { return px / pxPerMm.value }

  /** Спецификация нанесения для производства (§5.2), мультизона. */
  function toSpec() {
    return {
      placements: placements.value.map((p, i) => {
        const z = zoneByName(p.zone)
        const r = rectFor(z)
        const ppm = pxPerMmFor(z)
        const toMmZ = (px: number) => +(px / ppm).toFixed(1)
        return {
          zone: p.zone || 'unknown',
          x_mm: toMmZ(p.x - r.x),
          y_mm: toMmZ(p.y - r.y),
          width_mm: toMmZ(p.width),
          height_mm: toMmZ(p.height),
          rotation_deg: Math.round(p.rotation),
          layer: i + 1,
          kind: p.kind,
          opacity: p.opacity ?? 1,
          locked: p.locked ?? false,
          source: p.kind === 'text' ? 'text' : p.kind === 'shape' ? 'shape' : p.source,
          ...(p.kind === 'image'
            ? {
                asset_url: p.assetUrl, preview_asset_url: p.assetUrl, source_file_url: p.sourceFileUrl,
                natural_w: p.naturalW, natural_h: p.naturalH,
                vector: !!p.vector, pattern: !!p.pattern, pattern_scale: p.patternScale, filters: p.filters,
              }
            : p.kind === 'shape'
              ? { shape_type: p.shapeType, fill: p.fill, stroke: p.stroke, stroke_width: p.strokeWidth }
              : {
                  text: p.text, font: p.fontFamily, fill: p.fill,
                  align: p.align, stroke: p.stroke, stroke_width: p.strokeWidth,
                  letter_spacing: p.letterSpacing, line_height: p.lineHeight, curve: p.curve,
                }),
        }
      }),
      product_color_hex: productColorHex.value,
      material: material.value?.fabric_type,
      print_mode: printMode.value,
      print_method: material.value?.print_method as PrintMethod,
      color_count: material.value?.print_method === 'silkscreen' ? colorCount.value : undefined,
      px_per_mm: +pxPerMm.value.toFixed(4),
      composition_url: compositionUrl.value,
      // готовые печатные файлы на зону (300 DPI, прозрачный фон) — §13.2, артефакт «для печати»
      print_files: printFiles.value,
      // принт из библиотеки → атрибуция роялти дизайнеру (CRM §7.3)
      print_id: placements.value.find(p => p.printId)?.printId ?? null,
    }
  }

  // ── скриншот композиции (§13.2, артефакт «для глаз») ──────────
  // CustomizerCanvas регистрирует Konva stage; здесь снимаем композицию в blob.
  const stageNode = useState<unknown>('design_stage', () => null)
  const compositionUrl = useState<string | null>('design_composition_url', () => null)
  function registerStage(node: unknown) { stageNode.value = node }
  function setCompositionUrl(url: string | null) { compositionUrl.value = url }
  // сброс зума/пана сцены — регистрируется холстом (у него локальный zoom-стейт)
  const resetViewFn = useState<(() => void) | null>('design_reset_view', () => null)
  function registerResetView(fn: (() => void) | null) { resetViewFn.value = fn }

  function captureComposition(): Promise<Blob | null> {
    // сбрасываем зум/пан перед снимком, иначе превью-миниатюра (корзина, галерея,
    // шаринг) снимется как увеличенный кроп текущего вида, а не всё изделие.
    resetViewFn.value?.()
    const st = stageNode.value as { toBlob?: (o: { pixelRatio?: number; mimeType?: string; callback: (b: Blob | null) => void }) => void } | null
    if (!st?.toBlob) return Promise.resolve(null)
    return new Promise((resolve) => {
      try {
        st.toBlob!({ pixelRatio: 2, mimeType: 'image/png', callback: b => resolve(b) })
      } catch { resolve(null) }
    })
  }

  // ── печатный артефакт на зону (§13.2, «для печати») ───────────
  // CustomizerCanvas регистрирует экспортёр (у него Konva + загруженные образы).
  // Возвращает по blob на каждую занятую зону: только слой дизайна, прозрачный
  // фон, 300 DPI, кроп по зоне. Это закрывает проблему шрифтов в цеху (текст
  // запекается в растр) и убирает двусмысленность реконструкции.
  type ZoneBlob = { zone: string; blob: Blob; w: number; h: number }
  const exporterFn = useState<((dpi: number) => Promise<ZoneBlob[]>) | null>('design_exporter', () => null)
  const printFiles = useState<PrintFile[]>('design_print_files', () => [])
  function registerExporter(fn: ((dpi: number) => Promise<ZoneBlob[]>) | null) { exporterFn.value = fn }

  async function generatePrintFiles(dpi = 300): Promise<PrintFile[]> {
    const fn = exporterFn.value
    if (!fn) { printFiles.value = []; return [] }
    let blobs: ZoneBlob[]
    try { blobs = await fn(dpi) } catch { blobs = [] }
    const supabase = useSupabaseClient()
    const out: PrintFile[] = []
    for (const b of blobs) {
      try {
        const path = `print/${Date.now()}-${Math.round(Math.random() * 1e9)}.png`
        const { error } = await supabase.storage.from('design-uploads').upload(path, b.blob, { contentType: 'image/png' })
        if (error) continue
        const url = supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
        out.push({ zone: b.zone, url, w: b.w, h: b.h, dpi })
      } catch { /* пропускаем зону, если выгрузка упала — не блокируем заказ */ }
    }
    printFiles.value = out
    return out
  }

  return {
    product, materialId, zoneName, productColorHex, placements, selectedId, colorCount,
    material, printMode, validZones, zone, zoneRect, pxPerMm, hasText, compositionUrl, printFiles,
    activePlacements, zonesWithPlacements, pxPerMmForZone, rectForZone, atPlacementLimit, MAX_PLACEMENTS,
    canUndo, canRedo, undo, redo,
    init, loadSpec, addImage, addText, addShape, updatePlacement, removePlacement,
    duplicatePlacement, reorder, replaceImageAsset, alignInZone, sizeCm, dpiOf, toMm, toSpec,
    registerStage, captureComposition, setCompositionUrl, registerExporter, registerResetView, generatePrintFiles,
  }
}
