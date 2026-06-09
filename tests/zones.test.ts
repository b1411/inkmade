import { describe, it, expect } from 'vitest'
import {
  dpiAtMaxSize, zonePresetsForMode, getZonePreset, DPI_MIN, ALL_ZONE_PRESETS,
} from '../shared/config/zones'

describe('dpiAtMaxSize', () => {
  it('считает DPI по физическому размеру печати', () => {
    // 1000px на 169.3мм ≈ 150 DPI
    expect(dpiAtMaxSize(1000, 1000, { width: 169.3, height: 169.3 })).toBe(150)
  })

  it('берёт МЕНЬШИЙ DPI из двух осей (узкое место качества)', () => {
    // по ширине высокий DPI, по высоте низкий → возвращает низкий
    const dpi = dpiAtMaxSize(2000, 500, { width: 100, height: 200 })
    const dpiX = Math.floor((2000 / 100) * 25.4)
    const dpiY = Math.floor((500 / 200) * 25.4)
    expect(dpi).toBe(Math.min(dpiX, dpiY))
  })

  it('крупный файл на малой площади даёт высокий DPI', () => {
    expect(dpiAtMaxSize(4000, 4000, { width: 100, height: 100 })).toBeGreaterThan(DPI_MIN)
  })
})

describe('пресеты зон', () => {
  it('fullprint-режим даёт ровно одну зону на всю поверхность', () => {
    const p = zonePresetsForMode('fullprint')
    expect(p).toHaveLength(1)
    expect(p[0]!.name).toBe('fullprint')
    expect(p[0]!.mode).toBe('fullprint')
  })

  it('zonal-режим даёт зоны грудь/спина/рукава', () => {
    const names = zonePresetsForMode('zonal').map(z => z.name)
    expect(names).toContain('chest')
    expect(names).toContain('back')
    expect(names).toContain('sleeve_left')
  })

  it('getZonePreset находит по машинному имени и возвращает undefined для неизвестного', () => {
    expect(getZonePreset('chest')?.title).toBe('Грудь')
    expect(getZonePreset('cap_front')?.mode).toBe('zonal')
    expect(getZonePreset('does_not_exist')).toBeUndefined()
  })

  it('у всех пресетов положительные размеры и согласованный режим', () => {
    for (const z of ALL_ZONE_PRESETS) {
      expect(z.max_width_mm).toBeGreaterThan(0)
      expect(z.max_height_mm).toBeGreaterThan(0)
      expect(['zonal', 'fullprint']).toContain(z.mode)
    }
  })
})
