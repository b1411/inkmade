<script setup lang="ts">
// Товары категории (§6.1). SSR для SEO. Категория проверяется по БД.
// Единая карточка CatalogProductCard, скелетоны при загрузке, auto-animate сетки.
const { t } = useI18n()
const route = useRoute()
const category = route.params.category as string
const { listByCategory } = useCatalog()
const { listActive } = useCategories()

const { data: cat } = await useAsyncData(`cat-${category}`, async () => {
  const cats = await listActive()
  return cats.find(c => c.slug === category) ?? null
})
if (!cat.value) throw createError({ statusCode: 404, statusMessage: t('catalog.category.notFound') })
const label = cat.value.title
useSeoMeta({
  title: t('catalog.category.metaTitle', { label }),
  description: t('catalog.category.metaDescription', { label }),
  ogTitle: t('catalog.category.metaTitle', { label }),
  ogDescription: t('catalog.category.ogDescription', { label }),
})

const { data: products, pending } = await useAsyncData(
  `catalog-${category}`,
  () => listByCategory(category),
)
const count = computed(() => products.value?.length ?? 0)
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-end justify-between gap-4">
      <div>
        <UiSectionLabel accent>{{ $t('catalog.label') }}</UiSectionLabel>
        <h1 class="ink-display text-h1 mt-2">{{ label }}</h1>
        <p v-if="!pending" class="ink-label text-ink-gray-600 mt-2">
          {{ count === 1 ? $t('catalog.category.countOne', { n: count }) : $t('catalog.category.countMany', { n: count }) }}
        </p>
      </div>
      <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('catalog.category.toCategories') }}</UButton>
    </div>

    <!-- Скелетоны загрузки -->
    <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="n in 8" :key="n" class="rounded-lg overflow-hidden">
        <UiSkeleton rounded="rounded-lg" class="aspect-4/5" />
        <div class="p-4 space-y-2">
          <UiSkeleton class="h-4 w-3/4" />
          <UiSkeleton class="h-3 w-1/3" />
        </div>
      </div>
    </div>

    <!-- Пустой результат -->
    <UiEmptyState
      v-else-if="!products?.length"
      icon="i-lucide-package-search"
      :title="$t('catalog.category.emptyTitle')"
      :text="$t('catalog.category.emptyText')"
    >
      <UiAppButton to="/catalog" variant="primary" size="md">{{ $t('catalog.category.toCatalog') }}</UiAppButton>
    </UiEmptyState>

    <!-- Сетка товаров -->
    <div v-else v-auto-animate class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(p, i) in products" :key="p.id" :delay="Math.min(i * 50, 400)">
        <CatalogProductCard :product="p" />
      </UiReveal>
    </div>
  </section>
</template>
