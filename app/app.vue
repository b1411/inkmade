<script setup lang="ts">
// Язык документа следует за выбранной локалью i18n (RU по умолчанию, KK переключателем).
const { locale } = useI18n()
useHead({
  htmlAttrs: { lang: locale },
})

// Глобальные OG/Twitter-дефолты (P2 SEO): расшары страниц без собственной картинки
// (лендинг/каталог) идут с брендовым og-default.jpg. Страницы товара/витрины ставят
// свой ogImage — он перекрывает этот дефолт (page-level > root-level).
const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
useSeoMeta({
  ogSiteName: 'INKMADE',
  ogType: 'website',
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
  </UApp>
</template>
