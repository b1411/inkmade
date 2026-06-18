<script setup lang="ts">
// Калькулятор цены в реальном времени (§5.5, §9.1) — главное отличие от B2B-референса.
// Итог «накручивается» (count-up) при каждом изменении — цена осязаема и честна.
const props = withDefaults(defineProps<{ quantity?: number }>(), { quantity: 1 })
const emit = defineEmits<{ addToCart: [] }>()
const { breakdown } = usePricing()

const lineTotal = computed(() => breakdown.value.unitPrice * Math.max(1, props.quantity))

// Count-up итоговой цены (§9.1). Под reduced-motion — мгновенно.
const display = ref(lineTotal.value)
const prefersReduced = useReducedMotion()
let tween: { kill: () => void } | null = null
watch(
  () => lineTotal.value,
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
    tween?.kill()
    const obj = { v: display.value }
    tween = gsap.to(obj, {
      v: to,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => (display.value = Math.round(obj.v)),
    })
  },
)
onBeforeUnmount(() => tween?.kill())
</script>

<template>
  <div class="border border-ink-gray-200 rounded-lg p-4 space-y-3">
    <UiSectionLabel accent>{{ $t('customize.price.label') }}</UiSectionLabel>
    <dl class="space-y-1 text-caption text-ink-gray-600">
      <div class="flex justify-between"><dt>{{ $t('customize.price.base') }}</dt><dd>{{ formatPrice(breakdown.base) }}</dd></div>
      <div v-if="breakdown.material" class="flex justify-between"><dt>{{ $t('customize.price.material') }}</dt><dd>+{{ formatPrice(breakdown.material) }}</dd></div>
      <div v-if="breakdown.method" class="flex justify-between"><dt>{{ $t('customize.price.method') }}</dt><dd>+{{ formatPrice(breakdown.method) }}</dd></div>
      <div v-if="breakdown.print" class="flex justify-between"><dt>{{ $t('customize.price.print') }}</dt><dd>+{{ formatPrice(breakdown.print) }}</dd></div>
      <div v-if="breakdown.text" class="flex justify-between"><dt>{{ $t('customize.price.text') }}</dt><dd>+{{ formatPrice(breakdown.text) }}</dd></div>
      <div v-if="breakdown.colors" class="flex justify-between"><dt>{{ $t('customize.price.colors') }}</dt><dd>+{{ formatPrice(breakdown.colors) }}</dd></div>
      <div v-if="quantity > 1" class="flex justify-between"><dt>{{ $t('customize.price.perUnit') }}</dt><dd>{{ formatPrice(breakdown.unitPrice) }} × {{ quantity }}</dd></div>
    </dl>
    <div class="flex justify-between items-baseline border-t border-ink-gray-200 pt-3">
      <span class="font-semibold">{{ $t('customize.price.total') }}</span>
      <span class="text-h3 font-bold text-ink-burgundy tabular-nums">{{ formatPrice(display) }}</span>
    </div>
    <UiAppButton variant="primary" size="lg" block icon="i-lucide-shopping-cart" @click="emit('addToCart')">
      {{ $t('customize.price.addToCart') }}
    </UiAppButton>
  </div>
</template>
