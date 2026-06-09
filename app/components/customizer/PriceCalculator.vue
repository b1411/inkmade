<script setup lang="ts">
// Калькулятор цены в реальном времени (§5.5, §9.1) — главное отличие от B2B-референса.
// Итог «накручивается» (count-up) при каждом изменении — цена осязаема и честна.
const emit = defineEmits<{ addToCart: [] }>()
const { breakdown } = usePricing()

// Count-up итоговой цены (§9.1). Под reduced-motion — мгновенно.
const display = ref(breakdown.value.unitPrice)
const prefersReduced = useReducedMotion()
watch(
  () => breakdown.value.unitPrice,
  (to) => {
    if (prefersReduced.value) {
      display.value = to
      return
    }
    const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
    if (!gsap) {
      display.value = to
      return
    }
    const obj = { v: display.value }
    gsap.to(obj, {
      v: to,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => (display.value = Math.round(obj.v)),
    })
  },
)
</script>

<template>
  <div class="border border-ink-gray-200 rounded-lg p-4 space-y-3">
    <UiSectionLabel accent>Цена</UiSectionLabel>
    <dl class="space-y-1 text-caption text-ink-gray-600">
      <div class="flex justify-between"><dt>Изделие</dt><dd>{{ breakdown.base }} ₸</dd></div>
      <div v-if="breakdown.material" class="flex justify-between"><dt>Материал</dt><dd>+{{ breakdown.material }} ₸</dd></div>
      <div v-if="breakdown.method" class="flex justify-between"><dt>Метод нанесения</dt><dd>+{{ breakdown.method }} ₸</dd></div>
      <div v-if="breakdown.print" class="flex justify-between"><dt>Печать</dt><dd>+{{ breakdown.print }} ₸</dd></div>
      <div v-if="breakdown.text" class="flex justify-between"><dt>Текст</dt><dd>+{{ breakdown.text }} ₸</dd></div>
    </dl>
    <div class="flex justify-between items-baseline border-t border-ink-gray-200 pt-3">
      <span class="font-semibold">Итого</span>
      <span class="text-h3 font-bold text-ink-burgundy tabular-nums">{{ display }} ₸</span>
    </div>
    <UiAppButton variant="primary" size="lg" block icon="i-lucide-shopping-cart" @click="emit('addToCart')">
      В корзину
    </UiAppButton>
  </div>
</template>
