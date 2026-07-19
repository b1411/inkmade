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
  <div class="min-h-screen bg-ink-black text-ink-cream lg:grid lg:grid-cols-[minmax(0,1fr)_42vw]">
    <div class="ink-grain flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
      <img src="/logo-light.svg" alt="INKMADE" width="1275" height="146" class="h-4.5 w-auto self-start">
      <p class="ink-display mt-10 text-[clamp(6rem,15vw,12rem)] leading-[.75] text-ink-burgundy-light">
        {{ error?.statusCode || '!' }}
      </p>
      <h1 class="ink-display mt-6 text-h2">{{ title }}</h1>
      <p class="mt-4 max-w-md text-lead text-ink-cream/75">{{ text }}</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <UiAppButton variant="primary" size="lg" on-dark @click="goHome">{{ $t('errorPage.toHome') }}</UiAppButton>
        <UiAppButton variant="secondary" size="lg" on-dark @click="goCatalog">{{ $t('errorPage.toCatalog') }}</UiAppButton>
      </div>
    </div>
    <div class="relative hidden min-h-screen overflow-hidden lg:block">
      <NuxtImg src="/media/products/blank/oversize-v01.webp" alt="" class="absolute inset-0 size-full object-contain p-8 grayscale-[.2]" sizes="42vw" />
      <div class="absolute inset-0 bg-gradient-to-r from-ink-black/65 via-transparent to-transparent" />
      <div class="absolute bottom-8 right-8 border border-white/20 bg-black/45 px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/60 backdrop-blur">
        Route interrupted / return to base
      </div>
    </div>
  </div>
</template>
