<script setup lang="ts">
// Фирменное лого-вставка (§4.1): граффити-шрифт (латиница, единственное место) + моно-сабтекст.
withDefaults(defineProps<{ subtitle?: boolean; to?: string }>(), {
  subtitle: true,
  to: '/',
})
</script>

<template>
  <NuxtLink :to="to" class="inline-flex flex-col leading-none">
    <span class="ink-logo text-2xl tracking-wide">INKMADE</span>
    <span v-if="subtitle" class="ink-label opacity-70 mt-1">{{ $t('footer.tagline') }}</span>
  </NuxtLink>
</template>
