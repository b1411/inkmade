import { calcPrice } from '~~/shared/config/pricing'

// Реактивная цена = функция от текущего состояния useDesign (§5.5).
// Пересчитывается при любом изменении дизайна.
export const usePricing = () => {
  const { product, material, printMode, placements, zone, hasText, toMm } = useDesign()

  const breakdown = computed(() => {
    const basePrice = product.value?.base_price ?? 0
    const materialSurcharge = material.value?.surcharge ?? 0
    const z = zone.value
    const zoneAreaMm2 = (Number(z?.max_width_mm) || 0) * (Number(z?.max_height_mm) || 0)

    // суммарная площадь принтов в мм² (ограничим площадью зоны)
    const printAreaMm2 = Math.min(
      zoneAreaMm2 || Infinity,
      placements.value.reduce((s, p) => s + toMm(p.width) * toMm(p.height), 0),
    )

    const zones = placements.value.length
      ? [{ mode: printMode.value, printAreaMm2, zoneAreaMm2 }]
      : []

    return calcPrice({ basePrice, materialSurcharge, zones, hasText: hasText.value, quantity: 1 })
  })

  return { breakdown }
}
