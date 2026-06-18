<script setup lang="ts">
// Политика конфиденциальности (§6, §10).
import { LEGAL, THIRD_PARTIES } from '~~/shared/config/legal'
const { t } = useI18n()
useHead({ title: t('legal.privacy.pageTitle') })
</script>

<template>
  <article class="max-w-2xl mx-auto py-8 space-y-5">
    <h1 class="ink-display text-h2">{{ $t('legal.privacy.title') }}</h1>
    <p class="text-caption text-ink-gray-400 font-mono uppercase tracking-wider">
      {{ $t('legal.common.edition', { version: LEGAL.privacyVersion, date: LEGAL.effectiveDate, jurisdiction: LEGAL.jurisdiction }) }}
    </p>

    <UiPanel>
    <div class="space-y-6">
    <section class="space-y-2">
      <h2 class="text-h3 font-bold">{{ $t('legal.privacy.collect.heading') }}</h2>
      <p>{{ $t('legal.privacy.collect.body') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">{{ $t('legal.privacy.usage.heading') }}</h2>
      <p>{{ $t('legal.privacy.usage.body') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">{{ $t('legal.privacy.sharing.heading') }}</h2>
      <p>{{ $t('legal.privacy.sharing.body', { jurisdiction: LEGAL.jurisdiction }) }}</p>
      <ul class="space-y-1 mt-2">
        <li v-for="tp in THIRD_PARTIES" :key="tp.name" class="text-caption text-ink-gray-600">
          <span class="font-semibold text-ink-black">{{ tp.name }}</span> ({{ tp.country }}) — {{ tp.purpose }}
        </li>
      </ul>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">{{ $t('legal.privacy.rights.heading') }}</h2>
      <p>{{ $t('legal.privacy.rights.bodyBefore') }}
        <a :href="`mailto:${LEGAL.supportEmail}`" class="text-ink-burgundy font-semibold">{{ LEGAL.supportEmail }}</a>{{ $t('legal.privacy.rights.bodyAfter') }}</p>
    </section>
    </div>
    </UiPanel>

    <NuxtLink to="/" class="text-ink-burgundy inline-flex items-center gap-1"><UIcon name="i-lucide-arrow-left" class="size-4" />{{ $t('legal.common.toHome') }}</NuxtLink>
  </article>
</template>
