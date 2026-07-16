<script setup lang="ts">
// Брендовая страница ошибки (§4.4): спокойный текст + выход, без технических деталей.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const is404 = computed(() => props.error?.statusCode === 404)
const title = computed(() => (is404.value ? t('errorPage.notFoundTitle') : t('errorPage.genericTitle')))
const text = computed(() =>
  is404.value ? t('errorPage.notFoundText') : t('errorPage.genericText'),
)

useHead({ title: () => `${title.value} — INKMADE` })

function goHome() {
  clearError({ redirect: '/' })
}
function goCatalog() {
  clearError({ redirect: '/catalog' })
}
</script>

<template>
  <div class="ink-grain min-h-screen flex flex-col items-center justify-center text-center px-4 bg-ink-black text-ink-cream">
    <img src="/logo-light.svg" alt="INKMADE" width="1275" height="146" class="h-4.5 w-auto">
    <p class="ink-display text-[8rem] leading-none mt-6 text-ink-burgundy-light">
      {{ error?.statusCode || '!' }}
    </p>
    <h1 class="ink-display text-h2 mt-2">{{ title }}</h1>
    <p class="text-lead text-ink-cream/75 mt-4 max-w-md">{{ text }}</p>
    <div class="flex flex-wrap gap-3 mt-8 justify-center">
      <UiAppButton variant="primary" size="lg" on-dark @click="goHome">{{ $t('errorPage.toHome') }}</UiAppButton>
      <UiAppButton variant="secondary" size="lg" on-dark @click="goCatalog">{{ $t('errorPage.toCatalog') }}</UiAppButton>
    </div>
  </div>
</template>
