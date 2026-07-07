<script setup lang="ts">
// Хаб юридических документов — единая точка входа (SEO + удобство).
import { LEGAL_DOCS, LEGAL_DOC_ORDER } from '~~/shared/legal/documents'
const { t } = useI18n()
useHead({ title: () => `${t('legal.hub.title')} — INKMADE` })
const docs = LEGAL_DOC_ORDER.map(slug => LEGAL_DOCS[slug])
</script>

<template>
  <article class="max-w-3xl mx-auto py-8 space-y-6">
    <header class="space-y-2">
      <h1 class="ink-display text-h2">{{ $t('legal.hub.title') }}</h1>
      <p class="text-ink-gray-600">{{ $t('legal.hub.subtitle') }}</p>
    </header>
    <div class="grid sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="d in docs"
        :key="d.slug"
        :to="`/legal/${d.slug}`"
        class="block rounded-(--radius-md) border border-ink-gray-200 p-4 hover:border-ink-burgundy transition-colors"
      >
        <p class="font-semibold text-ink-black">{{ d.title }}</p>
        <p class="text-caption text-ink-gray-500 mt-1">{{ d.summary }}</p>
      </NuxtLink>
    </div>
  </article>
</template>
