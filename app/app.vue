<script setup lang="ts">
// Язык документа следует за выбранной локалью i18n (RU по умолчанию, KK переключателем).
const { locale } = useI18n()
const route = useRoute()
const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')

// Канонический URL (P2 SEO): само-ссылающийся canonical по пути без query-строки —
// консолидирует варианты с параметрами (сортировка каталога и т.п.) в один URL для
// индексации. i18n strategy 'no_prefix' → один URL на страницу, поэтому self-canonical
// корректен. Страницы могут переопределить canonical своим useHead при необходимости.
const canonical = computed(() => site + route.path)
useHead({
  htmlAttrs: { lang: locale },
  link: [{ rel: 'canonical', href: canonical }],
})

// Глобальные OG/Twitter-дефолты (P2 SEO): расшары страниц без собственной картинки
// (лендинг/каталог) идут с брендовым og-default.jpg. Страницы товара/витрины ставят
// свой ogImage — он перекрывает этот дефолт (page-level > root-level).
useSeoMeta({
  ogSiteName: 'INKMADE',
  ogType: 'website',
  ogUrl: () => canonical.value,
  ogImage: `${site}/og-default.jpg`,
  twitterCard: 'summary_large_image',
  twitterImage: `${site}/og-default.jpg`,
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Cookie/трекинг-согласие (opt-in): пиксели грузятся только после «Принять» -->
    <LayoutCookieConsent />
    <!-- Глобальный confirm-модал (useConfirm) — вместо нативного window.confirm() -->
    <UiConfirmDialog />
  </UApp>
</template>
