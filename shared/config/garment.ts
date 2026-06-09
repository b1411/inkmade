// INKMADE — генератор силуэтов изделий для мокапа (§7.1).
// Принт показывается НА изделии: холст рисует силуэт нужного цвета, сверху — принт
// в пределах зоны. Силуэт — лёгкий векторный data-URI, перекрашивается мгновенно
// под выбранный цвет товара (productColorHex), без обращения к Storage.

export type GarmentKind = 'tee' | 'hoodie' | 'cap'

// размеры под холст кастомайзера (CANVAS 460×540)
export const GARMENT_VIEWBOX = { width: 460, height: 540 }

// Печатный кадр изделия для визуального редактора зон (§8.2.1):
// bodyPx — область силуэта (в координатах viewBox), где физически возможна печать;
// frameMm — её физический размер в мм. Связка задаёт масштаб мм↔px по каждой оси,
// согласованный с пресетами зон (chest/back живут в кадре ~360×480 мм).
export interface GarmentPrintFrame {
  bodyPx: { x: number; y: number; width: number; height: number }
  frameMm: { width: number; height: number }
}
export const GARMENT_PRINT_FRAME: Record<GarmentKind, GarmentPrintFrame> = {
  tee: { bodyPx: { x: 120, y: 150, width: 220, height: 330 }, frameMm: { width: 360, height: 480 } },
  hoodie: { bodyPx: { x: 120, y: 165, width: 220, height: 320 }, frameMm: { width: 360, height: 480 } },
  cap: { bodyPx: { x: 135, y: 215, width: 195, height: 85 }, frameMm: { width: 200, height: 130 } },
}

/** Тип силуэта по слагу/алиасу товара (шаблоны: tshirt/hoodie/cap…). */
export function garmentKindForSlug(slug?: string | null): GarmentKind {
  const s = (slug ?? '').toLowerCase()
  if (s.includes('hoodie') || s.includes('hudi') || s.includes('худи')) return 'hoodie'
  if (s.includes('cap') || s.includes('kepka') || s.includes('кепк')) return 'cap'
  return 'tee' // футболка/оверсайз/поло/свитшот — общий силуэт
}

// затемнить hex на долю amount (0..1) — для воротника/теней
function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function teeSvg(hex: string): string {
  const shade = darken(hex, 0.12)
  const seam = darken(hex, 0.22)
  return `
    <path d="M170,70 L120,55 L40,120 L80,210 L120,190 L120,480 L340,480 L340,190 L380,210 L420,120 L340,55 L290,70
             C282,118 250,138 230,138 C210,138 178,118 170,70 Z"
          fill="${hex}" stroke="${seam}" stroke-width="2"/>
    <path d="M170,70 C178,118 210,138 230,138 C250,138 282,118 290,70
             C272,96 252,108 230,108 C208,108 188,96 170,70 Z" fill="${shade}"/>
    <line x1="120" y1="190" x2="120" y2="480" stroke="${seam}" stroke-width="1.5"/>
    <line x1="340" y1="190" x2="340" y2="480" stroke="${seam}" stroke-width="1.5"/>`
}

function hoodieSvg(hex: string): string {
  const shade = darken(hex, 0.12)
  const seam = darken(hex, 0.22)
  const pocket = darken(hex, 0.08)
  return `
    <path d="M150,95 L120,80 L40,150 L80,235 L120,215 L120,490 L340,490 L340,215 L380,235 L420,150 L340,80 L310,95
             L310,150 L150,150 Z" fill="${hex}" stroke="${seam}" stroke-width="2"/>
    <path d="M150,95 C150,140 185,165 230,165 C275,165 310,140 310,95
             C300,128 268,145 230,145 C192,145 160,128 150,95 Z" fill="${shade}" stroke="${seam}" stroke-width="2"/>
    <rect x="155" y="350" width="150" height="95" rx="10" fill="${pocket}" stroke="${seam}" stroke-width="1.5"/>
    <line x1="222" y1="150" x2="218" y2="250" stroke="${seam}" stroke-width="3"/>
    <line x1="238" y1="150" x2="242" y2="250" stroke="${seam}" stroke-width="3"/>`
}

function capSvg(hex: string): string {
  const shade = darken(hex, 0.14)
  const seam = darken(hex, 0.24)
  return `
    <path d="M110,300 C110,170 350,170 350,300 C350,250 110,250 110,300 Z" fill="${hex}" stroke="${seam}" stroke-width="2"/>
    <path d="M110,300 C110,170 350,170 350,300 L300,300 C300,210 160,210 160,300 Z" fill="${shade}"/>
    <path d="M105,300 C60,300 60,345 130,348 L350,348 C360,320 340,300 300,300 Z" fill="${shade}" stroke="${seam}" stroke-width="2"/>
    <circle cx="230" cy="180" r="7" fill="${seam}"/>`
}

const BUILDERS: Record<GarmentKind, (hex: string) => string> = {
  tee: teeSvg,
  hoodie: hoodieSvg,
  cap: capSvg,
}

/** SVG-разметка силуэта изделия выбранного цвета. */
export function garmentSvg(kind: GarmentKind, hex: string): string {
  const { width, height } = GARMENT_VIEWBOX
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${BUILDERS[kind](hex)}</svg>`
}

/** data-URI силуэта для загрузки как Image (не тейнтит canvas). */
export function garmentDataUri(kind: GarmentKind, hex: string): string {
  return `data:image/svg+xml,${encodeURIComponent(garmentSvg(kind, hex))}`
}
