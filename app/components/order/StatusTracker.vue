<script setup lang="ts">
// Статус-трекер заказа (§6.6): горизонтальная линия этапов с анимированным
// заполнением до текущего, пульс текущего этапа, галочки пройденных. Линия по
// умолчанию заполнена до current (reduced/без-JS), JS сворачивает и доводит.
interface Props {
  stages: string[]
  current: number
}
const props = defineProps<Props>()

const fraction = computed(() => {
  if (props.stages.length < 2) return 0
  const c = Math.max(0, Math.min(props.current, props.stages.length - 1))
  return c / (props.stages.length - 1)
})

const fill = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
let ctx: { revert: () => void } | null = null

onMounted(async () => {
  if (prefersReduced.value) return
  const el = fill.value
  if (!el) return
  const { gsap } = await import('~/utils/gsap-loader').then(module => module.loadGsap())
  if (!el.isConnected) return
  ctx = gsap.context(() => {
    gsap.fromTo(el, { scaleX: 0 }, { scaleX: fraction.value, duration: 0.9, ease: 'power2.out', delay: 0.15 })
  }, el)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div class="relative">
    <!-- трек + анимированное заполнение (между центрами крайних точек) -->
    <div class="absolute left-4 right-4 top-4 h-0.5 -translate-y-1/2 bg-ink-gray-200 rounded-full overflow-hidden">
      <div
        ref="fill"
        class="h-full bg-ink-burgundy origin-left"
        :style="{ transform: `scaleX(${fraction})` }"
      />
    </div>

    <ol class="relative flex justify-between">
      <li v-for="(st, i) in stages" :key="st" class="flex flex-col items-center text-center">
        <div
          class="size-8 rounded-full flex items-center justify-center text-caption font-bold transition-colors"
          :class="[
            i < current ? 'bg-ink-burgundy text-ink-cream' : '',
            i === current ? 'bg-ink-burgundy text-ink-cream status-pulse' : '',
            i > current ? 'bg-ink-gray-200 text-ink-gray-400' : '',
          ]"
        >
          <UIcon v-if="i < current" name="i-lucide-check" class="size-4" />
          <span v-else>{{ i + 1 }}</span>
        </div>
        <span
          class="text-caption mt-2 max-w-20"
          :class="i <= current ? 'text-ink-black font-medium' : 'text-ink-gray-400'"
        >{{ st }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
/* Пульс текущего этапа (§6.6) — бордо-кольцо. Гасится глобальным reduced-motion. */
.status-pulse {
  box-shadow: 0 0 0 0 rgba(122, 31, 40, 0.45);
  animation: status-pulse 2s var(--ease-out) infinite;
}
@keyframes status-pulse {
  70% {
    box-shadow: 0 0 0 10px rgba(122, 31, 40, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(122, 31, 40, 0);
  }
}
</style>
