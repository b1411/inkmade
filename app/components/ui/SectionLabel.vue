<script setup lang="ts">
// Моноширинный uppercase-лейбл (§2.3) — секции, табы, бейджи.
withDefaults(defineProps<{ accent?: boolean, inverse?: boolean }>(), {
  accent: false,
  inverse: false,
})
</script>

<template>
  <span
    class="ink-label"
    :class="inverse ? 'text-white/70' : accent ? 'text-ink-burgundy' : 'text-ink-gray-600'"
  >
    <slot />
  </span>
</template>
