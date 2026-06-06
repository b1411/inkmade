<script setup lang="ts">
// Фирменное лого-вставка (§2.3): дисплейный граффити-шрифт (латиница) + моно-сабтекст.
withDefaults(defineProps<{ subtitle?: boolean; to?: string }>(), {
  subtitle: true,
  to: '/',
})
</script>

<template>
  <NuxtLink :to="to" class="inline-flex flex-col leading-none">
    <span class="ink-display text-2xl tracking-wide">INKMADE</span>
    <span v-if="subtitle" class="ink-label opacity-70 mt-1">Merch Studio · EST. 2025</span>
  </NuxtLink>
</template>
