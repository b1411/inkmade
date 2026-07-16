// INKMADE — зоны печати, DPI-пороги, пресеты (паспорт §5.2.1, §7, §10).
import type { PrintMode } from './print-methods'

// DPI-пороги — только для ИНДИКАТОРА качества в инспекторе (тон бейджа).
// Политика: загрузку/заказ НЕ блокируем при низком DPI — принимаем любое разрешение,
// оператор согласует качество с клиентом перед печатью.
export const DPI_MIN = 150 // ниже — красный бейдж-предупреждение (не блокирует)
export const DPI_TARGET = 300 // цель качества (зелёный бейдж)

export interface BoundsMm {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Посадка и характеристики изделия — products.fit (миграция 0088, спека §42.1).
 * Всё опционально: блок редакционный, заполняется по мере появления данных, и
 * карточка показывает ровно то, что заполнено.
 */
export interface ProductFit {
  /** «Свободная oversize», «Классическая» — §42.1 fit label. */
  label?: string
  /** «Для более собранной посадки выберите на размер меньше.» */
  recommendation?: string
  model?: { heightCm?: number, wornSize?: string, chestCm?: number }
  composition?: string
  densityGsm?: number
  care?: string
  /** §42.1: shrinkage note, если применимо. */
  shrinkage?: string
}

/**
 * Замер изделия на размер — элемент products.size_chart (миграция 0088, §42.1).
 * `size` обязан совпадать с variants.size, иначе строка не найдёт свой размер.
 * Мерки опциональны: у кепки нет длины рукава, и это нормально.
 */
export interface SizeChartRow {
  size: string
  chestCm?: number
  lengthCm?: number
  shoulderCm?: number
  sleeveCm?: number
}

/**
 * Прямоугольник зоны в НОРМАЛИЗОВАННЫХ координатах холста кастомайзера
 * (0..1 от CANVAS 460×540) — миграция 0087, колонка print_zones.bounds_canvas.
 *
 * Зачем понадобился ещё один тип координат. BoundsMm описывает зону в мм от начала
 * печатного поля изделия, но чтобы перевести это в пиксели, нужно знать, ГДЕ на
 * картинке лежит само поле. Прежняя связка (garment.ts GARMENT_PRINT_FRAME:
 * bodyPx + frameMm) отвечала на это только для векторного силуэта — и с разным
 * масштабом по осям. Холст же показывает реальное фото товара с другим кадром,
 * поэтому зона уезжала: у груди футболки выходило 374×468 px вместо 122×172.
 *
 * Здесь координаты сразу в пространстве холста, поэтому переводить нечего:
 * что админ нарисовал поверх изображения — то покупатель и видит. Физический
 * масштаб выводится один на обе оси: pxPerMm = width * CANVAS.width / max_width_mm.
 */
export interface BoundsCanvas {
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
