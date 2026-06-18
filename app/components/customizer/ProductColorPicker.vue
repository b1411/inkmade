<script setup lang="ts">
// Выбор цвета изделия (§7.1). Превью перекрашивается в реальном времени, принт остаётся.
const { product, materialId, productColorHex } = useDesign()

const colors = computed(() => {
  const map = new Map<string, { name: string; hex: string }>()
  for (const v of product.value?.variants ?? []) {
    if (v.material_id === materialId.value && v.stock > 0) {
      map.set(v.color_hex, { name: v.color_name, hex: v.color_hex })
    }
  }
  return [...map.values()]
})

// если текущий цвет стал недоступен (сменили материал / закончился остаток) —
// переключаемся на первый доступный, чтобы не остаться без вариантов размера (H9)
watch(colors, (list) => {
  if (list.length && !list.find(c => c.hex === productColorHex.value)) {
    productColorHex.value = list[0]!.hex
  }
}, { immediate: true })
</script>

<template>
  <div v-if="colors.length">
    <UiSectionLabel>{{ $t('customize.colors.label') }}</UiSectionLabel>
    <div class="flex gap-2 mt-2">
      <button
        v-for="c in colors"
        :key="c.hex"
        :title="c.name"
        class="size-9 rounded-full border-2 transition-transform hover:scale-110"
        :class="c.hex === productColorHex ? 'border-ink-burgundy' : 'border-ink-gray-200'"
        :style="{ backgroundColor: c.hex }"
        @click="productColorHex = c.hex"
      />
    </div>
  </div>
</template>
