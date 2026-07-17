<script setup lang="ts">
// Появление секции при скролле (§8 ТЗ): fade + slide-up, один раз при входе в вьюпорт.
// Обёртка над @vueuse/motion (v-motion visible-once). Под prefers-reduced-motion
// CSS-гейт гасит transition; v-motion ставит финальные значения сразу — контент виден.
interface Props {
  delay?: number
  y?: number
  duration?: number
}
const props = withDefaults(defineProps<Props>(), { delay: 0, y: 24, duration: 700 })
const root = ref<HTMLElement | null>(null)
const armed = ref(false)
const visible = ref(true)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = root.value as HTMLElement | null
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  armed.value = true
  if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
  visible.value = false
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    visible.value = true
    observer?.disconnect()
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 })
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="root"
    class="ink-reveal"
    :class="{ 'ink-reveal--pending': armed && !visible }"
    :style="{
      '--reveal-y': `${props.y}px`,
      '--reveal-duration': `${props.duration}ms`,
      '--reveal-delay': `${props.delay}ms`,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.ink-reveal {
  transition:
    opacity var(--reveal-duration) var(--ease-out) var(--reveal-delay),
    transform var(--reveal-duration) var(--ease-out) var(--reveal-delay),
    filter var(--reveal-duration) var(--ease-out) var(--reveal-delay);
}
.ink-reveal--pending {
  opacity: 0;
  transform: translate3d(0, var(--reveal-y), 0);
  filter: blur(6px);
}
@media (prefers-reduced-motion: reduce) {
  .ink-reveal { transition: none; }
}
</style>
