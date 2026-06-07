// INKMADE — зоны печати, DPI-пороги, пресеты (паспорт §5.2.1, §7, §10).
import type { PrintMode } from './print-methods'

// DPI (§10, инвариант 1): порог считается от МАКСИМАЛЬНОГО размера изделия.
export const DPI_MIN = 150 // ниже — блокировать загрузку
export const DPI_TARGET = 300 // цель качества

export interface BoundsMm {
  x: number
  y: number
  width: number
  height: number
}

export interface ZonePreset {
  name: string // машинное имя ('chest'/'back'/...)
  title: string // отображаемое ('Грудь'/'Спина'/...)
  mode: PrintMode
  bounds_mm: BoundsMm
  max_width_mm: number
  max_height_mm: number
  placement_hint?: string
}

// Дефолтные пресеты зон для zonal-материалов (хлопок). Админ может править в мастере (F1-6).
export const ZONAL_ZONE_PRESETS: ZonePreset[] = [
  {
    name: 'chest',
    title: 'Грудь',
    mode: 'zonal',
    bounds_mm: { x: 55, y: 70, width: 200, height: 250 },
    max_width_mm: 200,
    max_height_mm: 250,
    placement_hint: 'Основной рисунок чуть ниже центра груди — это видимая зона на надетой вещи.',
  },
  {
    name: 'back',
    title: 'Спина',
    mode: 'zonal',
    bounds_mm: { x: 50, y: 60, width: 300, height: 400 },
    max_width_mm: 300,
    max_height_mm: 400,
    placement_hint: 'Крупный макет на спине — основная площадь для принта.',
  },
  {
    name: 'sleeve_left',
    title: 'Левый рукав',
    mode: 'zonal',
    bounds_mm: { x: 0, y: 0, width: 90, height: 120 },
    max_width_mm: 90,
    max_height_mm: 120,
    placement_hint: 'Небольшой акцент — лого или короткая надпись.',
  },
  {
    name: 'sleeve_right',
    title: 'Правый рукав',
    mode: 'zonal',
    bounds_mm: { x: 0, y: 0, width: 90, height: 120 },
    max_width_mm: 90,
    max_height_mm: 120,
    placement_hint: 'Небольшой акцент — лого или короткая надпись.',
  },
]

// Небольшая фронтальная зона для головных уборов (кепка).
export const CAP_FRONT_PRESET: ZonePreset = {
  name: 'cap_front',
  title: 'Перёд кепки',
  mode: 'zonal',
  bounds_mm: { x: 0, y: 0, width: 120, height: 80 },
  max_width_mm: 120,
  max_height_mm: 80,
  placement_hint: 'Небольшой лого или надпись по центру передней панели.',
}

// Единственная зона для fullprint-материалов (синтетика).
export const FULLPRINT_ZONE_PRESET: ZonePreset = {
  name: 'fullprint',
  title: 'Вся поверхность',
  mode: 'fullprint',
  bounds_mm: { x: 0, y: 0, width: 1000, height: 1000 },
  max_width_mm: 1000,
  max_height_mm: 1000,
  placement_hint: 'Сублимация запечатывает изделие целиком — макет на всю поверхность.',
}

/** Пресеты зон по режиму печати (для мастера товара). */
export function zonePresetsForMode(mode: PrintMode): ZonePreset[] {
  return mode === 'fullprint' ? [FULLPRINT_ZONE_PRESET] : ZONAL_ZONE_PRESETS
}

// Все известные пресеты (для создания товара из шаблона по имени зоны).
export const ALL_ZONE_PRESETS: ZonePreset[] = [
  ...ZONAL_ZONE_PRESETS,
  CAP_FRONT_PRESET,
  FULLPRINT_ZONE_PRESET,
]

/** Найти пресет зоны по машинному имени. */
export function getZonePreset(name: string): ZonePreset | undefined {
  return ALL_ZONE_PRESETS.find(z => z.name === name)
}

/**
 * DPI на максимальном размере изделия (§10).
 * @param pxW/pxH — пиксели исходника
 * @param maxPrintMm — физический размер печати на макс. размере изделия (products.max_print_mm)
 * Возвращает эффективный DPI по меньшей из осей (узкое место качества).
 */
export function dpiAtMaxSize(
  pxW: number,
  pxH: number,
  maxPrintMm: { width: number; height: number },
): number {
  const MM_PER_INCH = 25.4
  const dpiX = (pxW / maxPrintMm.width) * MM_PER_INCH
  const dpiY = (pxH / maxPrintMm.height) * MM_PER_INCH
  return Math.floor(Math.min(dpiX, dpiY))
}
