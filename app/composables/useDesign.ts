import type { ProductWithRelations, PrintZone, Material } from '~/types/models'
import type { PrintMethod, PrintMode } from '~~/shared/config/print-methods'

// Состояние дизайна + спецификация нанесения (§5.2, §7.4).
// Холст работает в px; в мм пересчитываем по коэффициенту зоны (PX_PER_MM).

export const CANVAS = { width: 460, height: 540 }
export const PX_PER_MM = 1.1 // масштаб отображения зоны на холсте

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

  // прямоугольник зоны на холсте (центрирован), px
  const zoneRect = computed(() => {
    const z = zone.value
    const wmm = z?.max_width_mm ?? 200
    const hmm = z?.max_height_mm ?? 250
    const w = wmm * PX_PER_MM
    const h = hmm * PX_PER_MM
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

  function addImage(assetUrl: string, naturalW: number, naturalH: number, source: 'upload' | 'library') {
    const r = zoneRect.value
    // вписываем в зону, сохраняя пропорции, до 70% ширины зоны
    const targetW = r.width * 0.7
    const scale = targetW / naturalW
    const w = targetW
    const h = naturalH * scale
    const pl: Placement = {
      id: nextId(), kind: 'image', source, assetUrl, naturalW, naturalH,
      x: r.x + (r.width - w) / 2,
      y: r.y + (r.height - h) / 2,
      width: w, height: Math.min(h, r.height), rotation: 0,
    }
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
  }

  function addText(text: string, fontFamily: string, fill: string) {
    const r = zoneRect.value
    const fontSize = 48
    const pl: Placement = {
      id: nextId(), kind: 'text', text, fontFamily, fill, fontSize,
      x: r.x + r.width * 0.1,
      y: r.y + r.height * 0.4,
      width: r.width * 0.8, height: fontSize * 1.3, rotation: 0,
    }
    placements.value = [...placements.value, pl]
    selectedId.value = pl.id
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
  function toMm(px: number) { return px / PX_PER_MM }

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
        ...(p.kind === 'image' ? { asset_url: p.assetUrl } : { text: p.text, font: p.fontFamily, fill: p.fill }),
      })),
      product_color_hex: productColorHex.value,
      material: material.value?.fabric_type,
      print_mode: printMode.value,
      print_method: material.value?.print_method as PrintMethod,
      px_per_mm: PX_PER_MM,
    }
  }

  return {
    product, materialId, zoneName, productColorHex, placements, selectedId,
    material, printMode, validZones, zone, zoneRect, hasText,
    init, addImage, addText, updatePlacement, removePlacement, toMm, toSpec,
  }
}
