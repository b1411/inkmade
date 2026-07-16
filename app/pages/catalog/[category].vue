<script setup lang="ts">
// Товары категории (§6.1). SSR для SEO. Категория проверяется по БД.
// Единая карточка CatalogProductCard, скелетоны при загрузке, auto-animate сетки.
const { t, locale } = useI18n()
const route = useRoute()
const category = route.params.category as string

// Русское склонение существительного после числа: 1 → «изделие», 2-4 → «изделия»,
// 0/5-20 → «изделий» (было: всегда countMany → «2 изделий»). В казахском форма не
// меняется после числительного — всегда countMany.
function categoryCountKey(n: number): string {
  if (locale.value !== 'ru') return 'catalog.category.countMany'
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'catalog.category.countOne'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'catalog.category.countFew'
  return 'catalog.category.countMany'
}
const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
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

// BreadcrumbList JSON-LD (P2 SEO): Главная → Каталог → Категория.
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'INKMADE', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: t('catalog.pageTitle'), item: `${site}/catalog` },
        { '@type': 'ListItem', position: 3, name: label, item: `${site}/catalog/${category}` },
      ],
    }),
  }],
})

const { data: products, pending } = await useAsyncData(
  `catalog-${category}`,
  () => listByCategory(category),
)
const count = computed(() => products.value?.length ?? 0)

// Клиентская сортировка витрины (данные уже пришли). 'new' = порядок сервера (created desc).
type SortKey = 'new' | 'price-asc' | 'price-desc'
const sort = ref<SortKey>('new')
const sortItems = computed(() => [
  { value: 'new', label: t('catalog.sort.newest') },
  { value: 'price-asc', label: t('catalog.sort.priceAsc') },
  { value: 'price-desc', label: t('catalog.sort.priceDesc') },
])
const sorted = computed(() => {
  const list = products.value ? [...products.value] : []
  if (sort.value === 'price-asc') list.sort((a, b) => a.base_price - b.base_price)
  else if (sort.value === 'price-desc') list.sort((a, b) => b.base_price - a.base_price)
  return list
})

// поиск по названию внутри категории (данные уже на клиенте)
const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? sorted.value.filter(p => p.title.toLowerCase().includes(q)) : sorted.value
})
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-end justify-between gap-4">
      <div>
        <UiSectionLabel accent>{{ $t('catalog.label') }}</UiSectionLabel>
        <h1 class="ink-display text-h1 mt-2">{{ label }}</h1>
        <!-- Ink Black (§3.3): микротекст — Muted, не Dark Soft. -->
        <p v-if="!pending" class="ink-label text-ink-text-muted mt-2">
          {{ $t(categoryCountKey(count), { n: count }) }}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <UInput
          v-if="!pending && count > 1"
          v-model="query"
          size="sm"
          icon="i-lucide-search"
          :placeholder="$t('catalog.searchPlaceholder')"
          :aria-label="$t('catalog.searchPlaceholder')"
          class="w-32 sm:w-40"
        />
        <USelect
          v-if="!pending && count > 1"
          v-model="sort"
          :items="sortItems"
          size="sm"
          variant="outline"
          icon="i-lucide-arrow-up-down"
          :aria-label="$t('catalog.sort.label')"
        />
        <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-arrow-left" class="hidden sm:inline-flex">{{ $t('catalog.category.toCategories') }}</UButton>
      </div>
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

    <!-- Ничего не найдено по поиску -->
    <UiEmptyState
      v-else-if="!filtered.length"
      icon="i-lucide-search-x"
      :title="$t('catalog.category.noMatchTitle')"
      :text="$t('catalog.category.noMatchText', { query })"
    >
      <UButton color="neutral" variant="subtle" icon="i-lucide-x" @click="query = ''">{{ $t('catalog.category.clearSearch') }}</UButton>
    </UiEmptyState>

    <!-- Сетка товаров -->
    <div v-else v-auto-animate class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(p, i) in filtered" :key="p.id" :delay="Math.min(i * 50, 400)">
        <CatalogProductCard :product="p" />
      </UiReveal>
    </div>
  </section>
</template>
