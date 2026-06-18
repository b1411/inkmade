<script setup lang="ts">
// Скелетон-плейсхолдер (§4.4): мерцающая форма контента вместо спиннера.
// role=status + aria-busy для доступности; reduced-motion гасит мерцание.
interface Props {
  rounded?: string
}
withDefaults(defineProps<Props>(), { rounded: 'rounded-md' })
</script>

<template>
  <div class="ink-skeleton" :class="rounded" role="status" aria-busy="true" :aria-label="$t('a11y.loading')" />
</template>
