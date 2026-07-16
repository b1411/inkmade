<script setup lang="ts">
// Фирменная надпись-лого (§4.1) + моно-сабтекст.
// tone — цвет САМИХ БУКВ, а не подложки под ними:
//   dark  — буквы ink-black → на светлый фон (по умолчанию)
//   light — буквы bone      → на тёмный фон
// Ассеты режет npm run logo из мастера public/media/wordmark.svg.
withDefaults(defineProps<{ subtitle?: boolean; to?: string; tone?: 'dark' | 'light' }>(), {
  subtitle: true,
  to: '/',
  tone: 'dark',
})
</script>

<template>
  <NuxtLink :to="to" class="inline-flex flex-col leading-none">
    <!-- width/height = кадр ассета: держит соотношение и резервирует место до загрузки (без CLS) -->
    <!-- h-3.5 = 122px по ширине. Узкое место — сайдбар админки (240px минус px-4 и бейдж
         ADMIN оставляют ~145px), поэтому выше не поднимать без проверки этого layout'а. -->
    <img :src="`/logo-${tone}.svg`" alt="INKMADE" width="1275" height="146" class="h-3.5 w-auto">
    <span v-if="subtitle" class="ink-label opacity-70 mt-1">{{ $t('footer.tagline') }}</span>
  </NuxtLink>
</template>
