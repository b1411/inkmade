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
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: props.y }"
    :visible-once="{
      opacity: 1,
      y: 0,
      transition: { duration: props.duration, delay: props.delay },
    }"
  >
    <slot />
  </div>
</template>
