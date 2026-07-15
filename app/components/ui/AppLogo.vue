<script setup lang="ts">
// Фирменная надпись-лого (§4.1) + моно-сабтекст.
// tone — цвет САМИХ БУКВ, а не подложки под ними:
//   dark  — тёмные буквы в кремовой обводке → на светлый фон (по умолчанию)
//   light — кремовые буквы в чёрной обводке → на тёмный фон
// Ассеты режет npm run logo из мастеров public/media/wordmark-*.svg.
withDefaults(defineProps<{ subtitle?: boolean; to?: string; tone?: 'dark' | 'light' }>(), {
  subtitle: true,
  to: '/',
  tone: 'dark',
})
</script>

<template>
  <NuxtLink :to="to" class="inline-flex flex-col leading-none">
    <!-- width/height = кадр ассета: держит соотношение и резервирует место до загрузки (без CLS) -->
    <img :src="`/logo-${tone}.svg`" alt="INKMADE" width="1328" height="305" class="h-7 w-auto">
    <span v-if="subtitle" class="ink-label opacity-70 mt-1">{{ $t('footer.tagline') }}</span>
  </NuxtLink>
</template>
