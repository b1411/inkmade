<script setup lang="ts">
// Хаб юридических документов — единая точка входа (SEO + удобство).
import { LEGAL_DOCS, LEGAL_DOC_ORDER } from '~~/shared/legal/documents'
const { t } = useI18n()
useHead({ title: () => `${t('legal.hub.title')} — INKMADE` })
const docs = LEGAL_DOC_ORDER.map(slug => LEGAL_DOCS[slug])
</script>

<template>
  <article class="mx-auto max-w-5xl space-y-8 py-4 sm:py-8">
    <header class="relative overflow-hidden bg-ink-black p-7 text-white sm:p-11">
      <div class="absolute -right-20 -top-28 size-80 rounded-full border border-white/10" />
      <div class="absolute -right-5 -top-12 size-52 rounded-full border border-ink-burgundy/50" />
      <UiSectionLabel accent>INKMADE / LEGAL</UiSectionLabel>
      <h1 class="ink-display mt-6 max-w-3xl text-[clamp(3rem,7vw,6rem)] leading-[.86] tracking-[-.05em]">{{ $t('legal.hub.title') }}</h1>
      <p class="mt-5 max-w-xl text-white/55">{{ $t('legal.hub.subtitle') }}</p>
    </header>
    <div class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="d in docs"
        :key="d.slug"
        :to="`/legal/${d.slug}`"
        class="group flex min-h-36 flex-col justify-between border border-ink-gray-200 bg-ink-white p-5 transition hover:-translate-y-0.5 hover:border-ink-burgundy hover:shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <p class="font-semibold text-ink-black">{{ d.title }}</p>
          <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-ink-burgundy transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <p class="mt-5 text-caption text-ink-gray-500">{{ d.summary }}</p>
      </NuxtLink>
    </div>
  </article>
</template>
