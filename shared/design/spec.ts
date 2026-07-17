export const DESIGN_SPEC_VERSION = 2 as const

export type DesignPlacementKind = 'image' | 'text' | 'shape'
export type PreflightSeverity = 'warning' | 'blocker'

export interface DesignCrop {
  /** Normalized source coordinates in the 0..1 range. */
  x: number
  y: number
  width: number
  height: number
}

export interface DesignPlacementV2 {
  zone: string
  kind?: DesignPlacementKind
  source?: string
  x_mm?: number
  y_mm?: number
  width_mm?: number
  height_mm?: number
  rotation_deg?: number
  opacity?: number
  asset_url?: string
  natural_w?: number
  natural_h?: number
  vector?: boolean
  text?: string
  fill?: string
  stroke_width?: number
  crop?: DesignCrop
  flip_x?: boolean
  flip_y?: boolean
  group_id?: string | null
  hidden?: boolean
  [key: string]: unknown
}

export interface DesignSpecV2 {
  version: typeof DESIGN_SPEC_VERSION
  placements: DesignPlacementV2[]
  product_color_hex?: string
  print_mode?: string
  print_method?: string
  [key: string]: unknown
}

export interface PreflightZone {
  name: string
  width_mm: number
  height_mm: number
}

export interface PreflightIssue {
  code:
    | 'empty_design'
    | 'missing_zone'
    | 'missing_asset'
    | 'invalid_geometry'
    | 'low_dpi'
    | 'thin_line'
    | 'safe_boundary'
    | 'low_contrast'
    | 'incompatible_print_mode'
  severity: PreflightSeverity
  placement: number | null
  zone?: string
  value?: number
}

export interface PreflightContext {
  zones?: PreflightZone[]
  supported_print_modes?: string[]
  min_dpi?: number
  safe_margin_mm?: number
  min_stroke_mm?: number
}

export interface PreflightResult {
  ready: boolean
  can_continue: boolean
  issues: PreflightIssue[]
  zones: string[]
  summary: { blockers: number; warnings: number }
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizedCrop(value: unknown): DesignCrop | undefined {
  if (!value || typeof value !== 'object') return undefined
  const crop = value as Partial<DesignCrop>
  if (![crop.x, crop.y, crop.width, crop.height].every(finite)) return undefined
  if (crop.width! <= 0 || crop.height! <= 0) return undefined
  return {
    x: Math.max(0, Math.min(1, crop.x!)),
    y: Math.max(0, Math.min(1, crop.y!)),
    width: Math.max(0.001, Math.min(1, crop.width!)),
    height: Math.max(0.001, Math.min(1, crop.height!)),
  }
}

/** Non-destructive adapter: old orders stay untouched; consumers receive a v2 view. */
export function adaptDesignSpec(raw: unknown): DesignSpecV2 {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawPlacements = Array.isArray(input.placements) ? input.placements : []
  const placements = rawPlacements.slice(0, 20).map((item) => {
    const p = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return {
      ...p,
      zone: typeof p.zone === 'string' ? p.zone : '',
      crop: normalizedCrop(p.crop),
      flip_x: p.flip_x === true,
      flip_y: p.flip_y === true,
      group_id: typeof p.group_id === 'string' ? p.group_id : null,
      hidden: p.hidden === true,
    } as DesignPlacementV2
  })

  return { ...input, version: DESIGN_SPEC_VERSION, placements } as DesignSpecV2
}

function rgb(hex: unknown): [number, number, number] | null {
  if (typeof hex !== 'string') return null
  const value = hex.trim().replace(/^#/, '')
  const expanded = value.length === 3 ? value.split('').map(char => char + char).join('') : value
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null
  return [0, 2, 4].map(i => Number.parseInt(expanded.slice(i, i + 2), 16)) as [number, number, number]
}

function contrastRatio(a: unknown, b: unknown): number | null {
  const values = [rgb(a), rgb(b)]
  if (!values[0] || !values[1]) return null
  const luminance = (value: [number, number, number]) => {
    const channels = value.map((channel) => {
      const c = channel / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  }
  const [l1, l2] = values.map(value => luminance(value!))
  return (Math.max(l1!, l2!) + 0.05) / (Math.min(l1!, l2!) + 0.05)
}

export function preflightDesign(raw: unknown, context: PreflightContext = {}): PreflightResult {
  const spec = adaptDesignSpec(raw)
  const issues: PreflightIssue[] = []
  const minDpi = context.min_dpi ?? 150
  const safeMargin = context.safe_margin_mm ?? 2
  const minStroke = context.min_stroke_mm ?? 0.6
  const zones = new Map((context.zones ?? []).map(zone => [zone.name, zone]))
  const visible = spec.placements.filter(placement => !placement.hidden)

  if (!visible.length) issues.push({ code: 'empty_design', severity: 'blocker', placement: null })
  if (context.supported_print_modes?.length && spec.print_mode && !context.supported_print_modes.includes(spec.print_mode)) {
    issues.push({ code: 'incompatible_print_mode', severity: 'blocker', placement: null })
  }

  visible.forEach((placement, index) => {
    const zone = placement.zone.trim()
    const width = placement.width_mm
    const height = placement.height_mm
    const x = placement.x_mm ?? 0
    const y = placement.y_mm ?? 0

    if (!zone || (zones.size > 0 && !zones.has(zone))) {
      issues.push({ code: 'missing_zone', severity: 'blocker', placement: index, zone: zone || undefined })
    }
    if (!finite(width) || !finite(height) || width <= 0 || height <= 0 || !finite(x) || !finite(y) || x < 0 || y < 0) {
      issues.push({ code: 'invalid_geometry', severity: 'blocker', placement: index, zone })
    }
    if (placement.kind === 'image' && !placement.asset_url) {
      issues.push({ code: 'missing_asset', severity: 'blocker', placement: index, zone })
    }

    if (placement.kind === 'image' && !placement.vector && finite(width) && finite(height) && width > 0 && height > 0 && finite(placement.natural_w) && finite(placement.natural_h)) {
      const dpi = Math.floor(Math.min((placement.natural_w / width) * 25.4, (placement.natural_h / height) * 25.4))
      if (dpi < minDpi) issues.push({ code: 'low_dpi', severity: 'warning', placement: index, zone, value: dpi })
    }
    if (finite(placement.stroke_width) && placement.stroke_width > 0 && placement.stroke_width < minStroke) {
      issues.push({ code: 'thin_line', severity: 'warning', placement: index, zone, value: placement.stroke_width })
    }

    const zoneSize = zones.get(zone)
    if (finite(width) && finite(height) && width > 0 && height > 0) {
      const touchesLeftOrTop = x < safeMargin || y < safeMargin
      const touchesRightOrBottom = !!zoneSize && (x + width > zoneSize.width_mm - safeMargin || y + height > zoneSize.height_mm - safeMargin)
      if (touchesLeftOrTop || touchesRightOrBottom) {
        issues.push({ code: 'safe_boundary', severity: 'warning', placement: index, zone })
      }
    }

    if ((placement.kind === 'text' || placement.kind === 'shape') && placement.fill && spec.product_color_hex) {
      const ratio = contrastRatio(placement.fill, spec.product_color_hex)
      if (ratio !== null && ratio < 1.5) issues.push({ code: 'low_contrast', severity: 'warning', placement: index, zone, value: +ratio.toFixed(2) })
    }
  })

  const blockers = issues.filter(issue => issue.severity === 'blocker').length
  const warnings = issues.length - blockers
  return {
    ready: issues.length === 0,
    can_continue: blockers === 0,
    issues,
    zones: [...new Set(visible.map(placement => placement.zone).filter(Boolean))],
    summary: { blockers, warnings },
  }
}
