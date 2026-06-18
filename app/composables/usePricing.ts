import { calcPrice } from '~~/shared/config/pricing'
import { METHOD_SURCHARGE, type PrintMethod } from '~~/shared/config/print-methods'
import type { Placement } from '~/composables/useDesign'

// Реактивная цена = функция от текущего состояния useDesign (§5.5).
// Пересчитывается при любом изменении дизайна. Мультизона: печать считается
// по каждой занятой зоне отдельно (площадь принта / площадь зоны), затем суммируется.
export const usePricing = () => {
  const { product, material, printMode, placements, zone, hasText, pxPerMmForZone, colorCount } = useDesign()

  const breakdown = computed(() => {
    const basePrice = product.value?.base_price ?? 0
    const materialSurcharge = material.value?.surcharge ?? 0
    const methodSurcharge = METHOD_SURCHARGE[material.value?.print_method as PrintMethod] ?? 0
    const isSilkscreen = material.value?.print_method === 'silkscreen'

    // группируем плейсменты по зоне
    const groups = new Map<string, Placement[]>()
    for (const p of placements.value) {
      const zn = p.zone || zone.value?.name || ''
      groups.set(zn, [...(groups.get(zn) ?? []), p])
    }

    const zones = [...groups.entries()].map(([zn, pls]) => {
      const z = product.value?.print_zones.find(zz => zz.name === zn)
      const zoneAreaMm2 = (Number(z?.max_width_mm) || 0) * (Number(z?.max_height_mm) || 0)
      const ppm = pxPerMmForZone(zn) || 1
      const printAreaMm2 = Math.min(
        zoneAreaMm2 || Infinity,
        pls.reduce((s, p) => s + (p.width / ppm) * (p.height / ppm), 0),
      )
      return { mode: printMode.value, printAreaMm2, zoneAreaMm2 }
    })

    return calcPrice({
      basePrice, materialSurcharge, methodSurcharge, zones, hasText: hasText.value, quantity: 1,
      perColorPricing: isSilkscreen && placements.value.length > 0,
      colorCount: colorCount.value,
    })
  })

  return { breakdown }
}
