<script setup lang="ts">
// Язык документа следует за выбранной локалью i18n (RU по умолчанию, KK переключателем).
const { locale } = useI18n()
useHead({
  htmlAttrs: { lang: locale },
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
