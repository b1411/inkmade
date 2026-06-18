<script setup lang="ts">
// Пользовательское соглашение (§10): перенос ответственности за авторские права на пользователя.
import { LEGAL } from '~~/shared/config/legal'
const { t, tm, rt } = useI18n()
useHead({ title: t('legal.terms.pageTitle') })

const sections = computed(() =>
  (tm('legal.terms.sections') as Array<{ heading: unknown; body: unknown }>).map((s) => ({
    heading: rt(s.heading as string),
    body: rt(s.body as string),
  })),
)
</script>

<template>
  <article class="max-w-2xl mx-auto py-8 space-y-5">
    <h1 class="ink-display text-h2">{{ $t('legal.terms.title') }}</h1>
    <p class="text-caption text-ink-gray-400 font-mono uppercase tracking-wider">
      {{ $t('legal.common.edition', { version: LEGAL.tosVersion, date: LEGAL.effectiveDate, jurisdiction: LEGAL.jurisdiction }) }}
    </p>
    <p class="text-ink-gray-600">{{ $t('legal.terms.intro', { jurisdiction: LEGAL.jurisdiction }) }}</p>

    <UiPanel>
    <div class="space-y-6">
    <section v-for="(section, i) in sections" :key="i" class="space-y-2">
      <h2 class="text-h3 font-bold">{{ section.heading }}</h2>
      <p>{{ section.body }}</p>
    </section>
    </div>
    </UiPanel>

    <NuxtLink to="/" class="text-ink-burgundy inline-flex items-center gap-1"><UIcon name="i-lucide-arrow-left" class="size-4" />{{ $t('legal.common.toHome') }}</NuxtLink>
  </article>
</template>
