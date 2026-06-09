import type { ProductWithRelations, PrintZone, Material } from '~/types/models'
import type { PrintMethod, PrintMode } from '~~/shared/config/print-methods'

// Состояние дизайна + спецификация нанесения (§5.2, §7.4).
// Холст работает в px; масштаб мм↔px вычисляется ДИНАМИЧЕСКИ — зона вписывается
// в холст (раньше была магическая константа 1.1, из-за которой крупные/fullprint
// зоны выходили за холст). spec в мм остаётся корректным: zoneRect и toMm
// используют один и тот же масштаб.

export const CANVAS = { width: 460, height: 540 }
const ZONE_PAD = 36 // отступ зоны от краёв холста, px

export interface Placement {
  id: string
  kind: 'image' | 'text'
  x: number // px на холсте (левый верх)
  y: number
  width: number // px
  height: number // px
  rotation: number // градусы
  // image
  source?: 'upload' | 'library'
  assetUrl?: string
  printId?: string // id принта из библиотеки (для атрибуции роялти дизайнеру)
  naturalW?: number // пиксели исходника (для DPI/пропорций)
  naturalH?: number
  // text
  text?: string
  fontFamily?: string
  fill?: string
  fontSize?: number
}

export const useDesign = () => {
  const product = useState<ProductWithRelations | null>('design_product', () => null)
  const materialId = useState<string>('design_material', () => '')
  const zoneName = useState<string>('design_zone', () => '')
  const productColorHex = useState<string>('design_color', () => '#111111')
  const placements = useState<Placement[]>('design_placements', () => [])
  const selectedId = useState<string | null>('design_selected', () => null)

  function init(p: ProductWithRelations) {
    product.value = p
    materialId.value = p.materials[0]?.id ?? ''
    zoneName.value = p.print_zones[0]?.name ?? ''
    productColorHex.value = p.variants[0]?.color_hex ?? '#111111'
    placements.value = []
    selectedId.value = null
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

  // масштаб px/мм: вписываем зону (max_width_mm × max_height_mm) в холст с отступами,
  // сохраняя пропорции. Так зона всегда видна целиком, а мм-вывод корректен.
  const pxPerMm = computed(() => {
    const z = zone.value
    const wmm = Number(z?.max_width_mm) || 200
    const hmm = Number(z?.max_height_mm) || 250
    const availW = CANVAS.width - ZONE_PAD * 2
    const availH = CANVAS.height - ZONE_PAD * 2
    return Math.min(availW / wmm, availH / hmm)
  })

  // прямоугольник зоны на холсте (центрирован), px
  const zoneRect = computed(() => {
    const z = zone.value
    const wmm = Number(z?.max_width_mm) || 200
    const hmm = Number(z?.max_height_mm) || 250
    const w = wmm * pxPerMm.value
    const h = hmm * pxPerMm.value
    return {
      x: (CANVAS.width - w) / 2,
      y: (CANVAS.height - h) / 2,
      width: w,
      height: h,
    }
  })

  // при смене материала держим валидную зону
  watch(printMode, () => {
    if (!validZones.value.find(z => z.name === zoneName.value)) {
      zoneName.value = validZones.value[0]?.name ?? ''
    }
  })

  // ── элементы ──────────────────────────────────────────────────
  let seq = 0
  function nextId() { return `pl_${Date.now()}_${seq++}` }

  function addImage(assetUrl: string, naturalW: number, naturalH: number, source: 'upload' | 'library', printId?: string) {
    const r = zoneRect.value
    // вписываем в зону, сохраняя пропорции, до 70% ширины зоны
    const targetW = r.width * 0.7
    const scale = targetW / naturalW
    const w = targetW
    const h = naturalH * scale
    // если по высоте не влезает — пересчитываем от высоты, сохраняя пропорции
    const fitScale = h > r.height ? r.height / (naturalH * scale) : 1
    const fw = w * fitScale
    const fh = h * fitScale
    const pl: Placement = {
      id: nextId(), kind: 'image', source, assetUrl, printId, naturalW, naturalH,
      x: r.x + (r.width - fw) / 2,
      y: r.y + (r.height - fh) / 2,
      width: fw, height: fh, rotation: 0,
    }
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
  }

  function addText(text: string, fontFamily: string, fill: string, fontSize = 48) {
    const r = zoneRect.value
    const pl: Placement = {
      id: nextId(), kind: 'text', text, fontFamily, fill, fontSize,
      x: r.x + r.width * 0.1,
      y: r.y + r.height * 0.4,
      width: r.width * 0.8, height: fontSize * 1.3, rotation: 0,
    }
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
  }

  // ── загрузка существующего дизайна для «доработать» (§3.1) ─────
  // Реконструирует состояние из spec (мм→px по текущей зоне). Приблизительно:
  // fontSize выводим из высоты, привязку принта восстанавливаем по spec.print_id.
  interface SpecPlacementIn {
    zone?: string; x_mm?: number; y_mm?: number; width_mm?: number; height_mm?: number
    rotation_deg?: number; source?: string; text?: string; font?: string; fill?: string
    asset_url?: string; natural_w?: number; natural_h?: number
  }
  interface SpecIn {
    placements?: SpecPlacementIn[]; product_color_hex?: string
    material?: string; print_method?: string; print_id?: string | null
  }
  function loadSpec(raw: unknown) {
    const spec = raw as SpecIn | null
    if (!product.value || !spec) return
    // материал: по методу печати → по ткани → первый
    const mat = product.value.materials.find(m => m.print_method === spec.print_method)
      ?? product.value.materials.find(m => m.fabric_type === spec.material)
      ?? product.value.materials[0]
    if (mat) materialId.value = mat.id
    // зона из первой плейсменты (если валидна для режима)
    const firstZone = spec.placements?.[0]?.zone
    if (firstZone && validZones.value.find(z => z.name === firstZone)) zoneName.value = firstZone
    if (spec.product_color_hex) productColorHex.value = spec.product_color_hex

    const r = zoneRect.value
    const ppm = pxPerMm.value
    const next: Placement[] = []
    for (const p of spec.placements ?? []) {
      const width = (Number(p.width_mm) || 0) * ppm
      const height = (Number(p.height_mm) || 0) * ppm
      const x = r.x + (Number(p.x_mm) || 0) * ppm
      const y = r.y + (Number(p.y_mm) || 0) * ppm
      const rotation = Number(p.rotation_deg) || 0
      if (p.source === 'text') {
        next.push({
          id: nextId(), kind: 'text', x, y, width, height, rotation,
          text: p.text ?? '', fontFamily: p.font ?? 'Inter', fill: p.fill ?? '#111111',
          fontSize: Math.max(8, Math.round(height / 1.3)),
        })
      } else if (p.asset_url) {
        next.push({
          id: nextId(), kind: 'image', x, y, width, height, rotation,
          source: p.source === 'library' ? 'library' : 'upload',
          assetUrl: p.asset_url,
          printId: p.source === 'library' ? (spec.print_id ?? undefined) : undefined,
          naturalW: p.natural_w, naturalH: p.natural_h,
        })
      }
    }
    placements.value = next
    selectedId.value = null
  }

  function updatePlacement(id: string, patch: Partial<Placement>) {
    placements.value = placements.value.map(p => (p.id === id ? { ...p, ...patch } : p))
  }

  function removePlacement(id: string) {
    placements.value = placements.value.filter(p => p.id !== id)
    if (selectedId.value === id) selectedId.value = null
  }

  const hasText = computed(() => placements.value.some(p => p.kind === 'text'))

  // ── px ↔ мм относительно зоны (§7.4) ──────────────────────────
  function toMm(px: number) { return px / pxPerMm.value }

  /** Спецификация нанесения для производства (§5.2). */
  function toSpec() {
    const z = zone.value
    const r = zoneRect.value
    return {
      placements: placements.value.map((p, i) => ({
        zone: z?.name ?? 'unknown',
        x_mm: +toMm(p.x - r.x).toFixed(1),
        y_mm: +toMm(p.y - r.y).toFixed(1),
        width_mm: +toMm(p.width).toFixed(1),
        height_mm: +toMm(p.height).toFixed(1),
        rotation_deg: Math.round(p.rotation),
        layer: i + 1,
        source: p.kind === 'text' ? 'text' : p.source,
        ...(p.kind === 'image'
          ? { asset_url: p.assetUrl, preview_asset_url: p.assetUrl, natural_w: p.naturalW, natural_h: p.naturalH }
          : { text: p.text, font: p.fontFamily, fill: p.fill }),
      })),
      product_color_hex: productColorHex.value,
      material: material.value?.fabric_type,
      print_mode: printMode.value,
      print_method: material.value?.print_method as PrintMethod,
      px_per_mm: +pxPerMm.value.toFixed(4),
      composition_url: compositionUrl.value,
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

  function captureComposition(): Promise<Blob | null> {
    const st = stageNode.value as { toBlob?: (o: { pixelRatio?: number; mimeType?: string; callback: (b: Blob | null) => void }) => void } | null
    if (!st?.toBlob) return Promise.resolve(null)
    return new Promise((resolve) => {
      try {
        st.toBlob!({ pixelRatio: 2, mimeType: 'image/png', callback: b => resolve(b) })
      } catch { resolve(null) }
    })
  }

  return {
    product, materialId, zoneName, productColorHex, placements, selectedId,
    material, printMode, validZones, zone, zoneRect, pxPerMm, hasText, compositionUrl,
    init, loadSpec, addImage, addText, updatePlacement, removePlacement, toMm, toSpec,
    registerStage, captureComposition, setCompositionUrl,
  }
}
