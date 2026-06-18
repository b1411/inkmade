import { describe, it, expect } from 'vitest'
import { shapeData } from '../app/utils/konva-shapes'
import { hasFilters } from '../app/utils/konva-filters'

describe('shapeData', () => {
  it('rect — замкнутый путь в пределах bbox', () => {
    const d = shapeData('rect', 100, 60)
    expect(d.startsWith('M')).toBe(true)
    expect(d.trim().endsWith('Z')).toBe(true)
    expect(d).toContain('H100')
    expect(d).toContain('V60')
  })

  it('triangle — три вершины, замкнут', () => {
    const d = shapeData('triangle', 80, 80)
    const cmds = d.match(/[ML]/g) ?? []
    expect(cmds.length).toBe(3)
    expect(d.trim().endsWith('Z')).toBe(true)
  })

  it('circle — дуги (A), замкнут', () => {
    const d = shapeData('circle', 50, 50)
    expect(d).toContain('A')
    expect(d.trim().endsWith('Z')).toBe(true)
  })

  it('star — 10 вершин (5-конечная), замкнут', () => {
    const d = shapeData('star', 100, 100)
    const cmds = d.match(/[ML]/g) ?? []
    expect(cmds.length).toBe(10)
    expect(d.trim().endsWith('Z')).toBe(true)
  })

  it('heart — координаты не выходят за bbox', () => {
    const w = 120, h = 100
    const d = shapeData('heart', w, h)
    const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    expect(nums.length).toBeGreaterThan(10)
    for (const m of nums) {
      const x = Number(m[1]), y = Number(m[2])
      expect(x).toBeGreaterThanOrEqual(-0.5)
      expect(x).toBeLessThanOrEqual(w + 0.5)
      expect(y).toBeGreaterThanOrEqual(-0.5)
      expect(y).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('line — открытый горизонтальный путь', () => {
    const d = shapeData('line', 90, 10)
    expect(d).toContain('H90')
    expect(d.trim().endsWith('Z')).toBe(false)
  })
})

describe('hasFilters', () => {
  it('пусто/undefined → false', () => {
    expect(hasFilters(undefined)).toBe(false)
    expect(hasFilters({})).toBe(false)
  })

  it('нулевые значения не считаются активным фильтром', () => {
    expect(hasFilters({ brightness: 0, contrast: 0, saturation: 0, posterize: 0, blur: 0 })).toBe(false)
  })

  it('булевы флаги активируют', () => {
    expect(hasFilters({ grayscale: true })).toBe(true)
    expect(hasFilters({ sepia: true })).toBe(true)
    expect(hasFilters({ invert: true })).toBe(true)
  })

  it('ненулевые числовые активируют', () => {
    expect(hasFilters({ brightness: 0.2 })).toBe(true)
    expect(hasFilters({ contrast: -10 })).toBe(true)
    expect(hasFilters({ saturation: 1.5 })).toBe(true)
    expect(hasFilters({ blur: 3 })).toBe(true)
    expect(hasFilters({ posterize: 0.3 })).toBe(true)
  })
})
