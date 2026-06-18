import type { ImageFilters } from '~/composables/useDesign'

// Применение фильтров Konva к узлу изображения. Konva требует node.cache()
// перед фильтрами. Работает и для on-screen узлов холста, и для offscreen-узлов
// при экспорте печатного файла — поэтому логика вынесена сюда.
export function hasFilters(f?: ImageFilters): boolean {
  if (!f) return false
  return !!(f.grayscale || f.sepia || f.invert
    || (f.brightness && f.brightness !== 0)
    || (f.contrast && f.contrast !== 0)
    || (f.saturation && f.saturation !== 0)
    || (f.blur && f.blur > 0)
    || (f.posterize && f.posterize > 0))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyKonvaFilters(node: any, Konva: any, f?: ImageFilters): void {
  if (!node) return
  if (!hasFilters(f)) {
    try { node.clearCache?.() } catch { /* noop */ }
    node.filters([])
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = []
  if (f!.grayscale) list.push(Konva.Filters.Grayscale)
  if (f!.sepia) list.push(Konva.Filters.Sepia)
  if (f!.invert) list.push(Konva.Filters.Invert)
  if (f!.brightness) { list.push(Konva.Filters.Brighten); node.brightness(f!.brightness) }
  if (f!.contrast) { list.push(Konva.Filters.Contrast); node.contrast(f!.contrast) }
  if (f!.saturation) { list.push(Konva.Filters.HSL); node.saturation(f!.saturation) }
  if (f!.blur && f!.blur > 0) { list.push(Konva.Filters.Blur); node.blurRadius(f!.blur) }
  if (f!.posterize && f!.posterize > 0) { list.push(Konva.Filters.Posterize); node.levels(f!.posterize) }
  try { node.cache() } catch { /* noop */ }
  node.filters(list)
}
