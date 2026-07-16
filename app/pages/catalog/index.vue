<script setup lang="ts">
// Каталог категорий плитками (§6). Публичная страница, SSR. Категории — из БД.
const { t } = useI18n()
// SEO: индексируемая публичная страница — заголовок + описание + OG (P2 SEO).
// Переиспользуем существующий подзаголовок каталога как meta-description, чтобы не
// плодить i18n-ключи. Canonical/og:url ставятся глобально в app.vue.
useSeoMeta({
  title: t('catalog.pageTitle'),
  description: t('catalog.index.subtitle'),
  ogTitle: t('catalog.pageTitle'),
  ogDescription: t('catalog.index.subtitle'),
})

const { listActive } = useCategories()
const { data: categories } = await useAsyncData('catalog-categories', () => listActive())
</script>

<template>
  <section class="space-y-8">
    <div>
      <UiSectionLabel accent>{{ $t('catalog.label') }}</UiSectionLabel>
      <h1 class="ink-display text-h1 mt-2">{{ $t('catalog.index.title') }}</h1>
      <!-- Страница на Ink Black (§3.3), поэтому body — Text Secondary, а не Dark Soft. -->
      <p class="text-lead text-ink-text-soft mt-3">{{ $t('catalog.index.subtitle') }}</p>
    </div>

    <UiEmptyState
      v-if="!categories?.length"
      icon="i-lucide-layout-grid"
      :title="$t('catalog.index.emptyTitle')"
      :text="$t('catalog.index.emptyText')"
    />

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <UiReveal v-for="(c, i) in categories" :key="c.id" :delay="i * 60">
        <!-- Карточка остаётся светлой (Warm Card, §6.3): на Ink Black тёмным
             становится окружение, а не сами карточки. Текст внутри — Text Dark. -->
        <UiAppCard :to="`/catalog/${c.slug}`" hover class="h-full bg-ink-card">
          <div class="p-6 flex flex-col items-center gap-3 text-center">
            <UIcon :name="c.icon ?? 'i-lucide-package'" class="size-10 text-ink-burgundy" />
            <span class="font-semibold text-ink-text-dark">{{ c.title }}</span>
          </div>
        </UiAppCard>
      </UiReveal>
    </div>
  </section>
</template>
