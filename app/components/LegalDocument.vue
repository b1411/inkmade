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
  <article class="max-w-3xl mx-auto py-8 space-y-6">
    <header class="space-y-3">
      <NuxtLink to="/legal" class="text-caption text-ink-gray-500 inline-flex items-center gap-1 hover:text-ink-burgundy">
        <UIcon name="i-lucide-arrow-left" class="size-4" />{{ $t('legal.common.backToLegal') }}
      </NuxtLink>
      <h1 class="ink-display text-h2">{{ doc.title }}</h1>
      <p class="text-caption text-ink-gray-400 font-mono uppercase tracking-wider">
        {{ $t('legal.common.edition', { version: doc.version, date: LEGAL.effectiveDate, jurisdiction: LEGAL.jurisdiction }) }}
      </p>
      <p v-if="doc.intro" class="text-ink-gray-700 leading-relaxed">{{ doc.intro }}</p>
    </header>

    <UAlert
      v-if="showTranslationNotice"
      color="neutral"
      variant="subtle"
      icon="i-lucide-languages"
      :description="$t('legal.common.translationNotice', { lang: LEGAL.authoritativeLanguage })"
    />

    <!-- Оглавление для длинных документов -->
    <nav v-if="doc.sections.length > 3" class="rounded-(--radius-md) border border-ink-gray-200 p-4">
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
