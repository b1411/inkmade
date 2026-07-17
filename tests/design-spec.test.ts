import { describe, expect, it } from 'vitest'
import { adaptDesignSpec, preflightDesign } from '../shared/design/spec'

describe('design spec v2 adapter', () => {
  it('adapts legacy specs without mutating their geometry', () => {
    const legacy = { placements: [{ zone: 'front', width_mm: 100, height_mm: 120, asset_url: '/print.png' }] }
    const adapted = adaptDesignSpec(legacy)
    expect(adapted.version).toBe(2)
    expect(adapted.placements[0]).toMatchObject({ zone: 'front', width_mm: 100, flip_x: false, hidden: false })
    expect(legacy).not.toHaveProperty('version')
  })

  it('normalizes portable crop values', () => {
    const adapted = adaptDesignSpec({ placements: [{ zone: 'front', crop: { x: -1, y: 0.1, width: 2, height: 0.5 } }] })
    expect(adapted.placements[0]?.crop).toEqual({ x: 0, y: 0.1, width: 1, height: 0.5 })
  })
})

describe('design preflight', () => {
  it('blocks an empty design', () => {
    const result = preflightDesign({ version: 2, placements: [] })
    expect(result.can_continue).toBe(false)
    expect(result.issues[0]?.code).toBe('empty_design')
  })

  it('warns about dpi, contrast and a safe boundary without blocking checkout', () => {
    const result = preflightDesign({
      version: 2,
      product_color_hex: '#111111',
      placements: [{
        zone: 'front', kind: 'image', asset_url: '/print.png', x_mm: 0, y_mm: 10,
        width_mm: 200, height_mm: 200, natural_w: 500, natural_h: 500,
      }, {
        zone: 'front', kind: 'text', text: 'INK', fill: '#101010', x_mm: 10, y_mm: 10,
        width_mm: 40, height_mm: 10,
      }],
    }, { zones: [{ name: 'front', width_mm: 250, height_mm: 300 }] })
    expect(result.can_continue).toBe(true)
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['low_dpi', 'safe_boundary', 'low_contrast']))
  })

  it('blocks missing assets and unknown zones', () => {
    const result = preflightDesign({
      version: 2,
      placements: [{ zone: 'sleeve', kind: 'image', x_mm: 5, y_mm: 5, width_mm: 20, height_mm: 20 }],
    }, { zones: [{ name: 'front', width_mm: 200, height_mm: 250 }] })
    expect(result.summary.blockers).toBe(2)
    expect(result.can_continue).toBe(false)
  })
})
