<script setup lang="ts">
// Рендерер юридического документа (структура из shared/legal/documents.ts).
// Заголовок + строка редакции + оглавление (для длинных) + секции + контакты.
// Юридически значимая редакция — на русском; при иной локали показываем нотис.
import type { LegalDoc } from '~~/shared/legal/documents'
import { LEGAL, SELLER } from '~~/shared/config/legal'

const props = defineProps<{ doc: LegalDoc }>()
const { locale } = useI18n()

const showTranslationNotice = computed(() => locale.value !== 'ru')

useHead({ title: () => `${props.doc.title} — INKMADE` })
useSeoMeta({ description: () => props.doc.summary })

// Якоря по индексу — безопасно для кириллических заголовков.
const anchor = (i: number) => `sec-${i + 1}`
</script>

<template>
  <article class="mx-auto max-w-5xl space-y-6 py-4 sm:py-8">
    <header class="relative overflow-hidden bg-ink-black p-7 text-white sm:p-10">
      <div class="absolute -right-20 -top-24 size-72 rounded-full border border-white/10" />
      <NuxtLink to="/legal" class="relative inline-flex items-center gap-1 text-caption text-white/50 transition hover:text-white">
        <UIcon name="i-lucide-arrow-left" class="size-4" />{{ $t('legal.common.backToLegal') }}
      </NuxtLink>
      <h1 class="ink-display relative mt-8 max-w-4xl text-[clamp(2.8rem,6vw,5.5rem)] leading-[.88] tracking-[-.045em]">{{ doc.title }}</h1>
      <p class="relative mt-5 font-mono text-caption uppercase tracking-wider text-white/40">
        {{ $t('legal.common.edition', { version: doc.version, date: LEGAL.effectiveDate, jurisdiction: LEGAL.jurisdiction }) }}
      </p>
      <p v-if="doc.intro" class="relative mt-5 max-w-3xl leading-relaxed text-white/65">{{ doc.intro }}</p>
    </header>

    <UAlert
      v-if="showTranslationNotice"
      color="neutral"
      variant="subtle"
      icon="i-lucide-languages"
      :description="$t('legal.common.translationNotice', { lang: LEGAL.authoritativeLanguage })"
    />

    <!-- Оглавление для длинных документов -->
    <nav v-if="doc.sections.length > 3" class="border border-ink-gray-200 bg-ink-white p-5">
      <p class="ink-label text-ink-gray-500 mb-2">{{ $t('legal.common.tocTitle') }}</p>
      <ol class="space-y-1 text-caption">
        <li v-for="(s, i) in doc.sections" :key="`toc-${i}`">
          <a :href="`#${anchor(i)}`" class="text-ink-burgundy hover:underline">{{ s.heading }}</a>
        </li>
      </ol>
    </nav>

    <UiPanel>
      <div class="space-y-8">
        <section v-for="(s, i) in doc.sections" :id="anchor(i)" :key="`sec-${i}`" class="space-y-2 scroll-mt-24">
          <h2 class="text-h3 font-bold">{{ s.heading }}</h2>
          <p v-for="(p, j) in s.body ?? []" :key="`b-${j}`" class="text-ink-gray-700 leading-relaxed">{{ p }}</p>
          <ul v-if="s.list?.length" class="list-disc pl-5 space-y-1.5 text-ink-gray-700">
            <li v-for="(li, k) in s.list" :key="`l-${k}`" class="leading-relaxed">{{ li }}</li>
          </ul>
          <p v-for="(p, j) in s.note ?? []" :key="`n-${j}`" class="text-ink-gray-700 leading-relaxed">{{ p }}</p>
        </section>
      </div>
    </UiPanel>

    <!-- Контакты продавца/оператора -->
    <UiPanel v-if="doc.showContacts">
      <div class="space-y-1 text-caption text-ink-gray-600">
        <p class="ink-label text-ink-gray-500 mb-1">{{ $t('legal.common.contactsTitle') }}</p>
        <p>{{ SELLER.entityType }} {{ SELLER.legalName }} · {{ $t('legal.common.bin') }}: {{ SELLER.bin }}</p>
        <p>{{ SELLER.address }}</p>
        <p>{{ $t('legal.common.phone') }}: {{ SELLER.phone }}</p>
        <p>Email: <a :href="`mailto:${SELLER.email}`" class="text-ink-burgundy font-semibold">{{ SELLER.email }}</a></p>
      </div>
    </UiPanel>
  </article>
</template>
