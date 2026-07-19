<script setup lang="ts">
// Товары категории (§6.1). SSR для SEO. Категория проверяется по БД.
// Единая карточка CatalogProductCard, скелетоны при загрузке, auto-animate сетки.
const { t, locale } = useI18n()
const route = useRoute()
const category = route.params.category as string
onMounted(() => useAnalytics().catalogView(category))

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

const { data: cat, error: categoryError } = await useAsyncData(`cat-${category}`, async () => {
  const cats = await listActive()
  return cats.find(c => c.slug === category) ?? null
})
if (categoryError.value) throw createError({ statusCode: 503, statusMessage: t('errorPage.genericText'), cause: categoryError.value })
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

const { data: products, pending, error: productsError, refresh: refreshProducts } = await useAsyncData(
  `catalog-${category}`,
  () => listByCategory(category),
)
const retrying = ref(false)
async function retryProducts() {
  retrying.value = true
  try { await refreshProducts() } finally { retrying.value = false }
}
const count = computed(() => products.value?.length ?? 0)
const categoryVisual = computed(() => category === 'accessories'
  ? '/media/categories/bag-v01.webp'
  : '/media/products/blank/oversize-v01.webp')

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
    <div class="grid overflow-hidden border border-white/10 bg-ink-panel lg:grid-cols-[1.05fr_.95fr]">
      <div class="flex min-h-72 flex-col justify-between p-6 sm:p-9 lg:min-h-96 lg:p-12">
        <div class="flex items-center justify-between gap-4">
          <UiSectionLabel accent>{{ $t('catalog.label') }}</UiSectionLabel>
          <span v-if="!pending" class="ink-label text-ink-text-muted">
            {{ $t(categoryCountKey(count), { n: count }) }}
          </span>
        </div>
        <div>
          <h1 class="ink-display max-w-2xl text-[clamp(3rem,8vw,7rem)] leading-[.82] tracking-[-.055em] text-white">{{ label }}</h1>
          <NuxtLink to="/catalog" class="mt-7 inline-flex min-h-11 items-center gap-2 text-sm text-ink-text-soft transition-colors hover:text-white">
            <UIcon name="i-lucide-arrow-left" class="size-4" />
            {{ $t('catalog.category.toCategories') }}
          </NuxtLink>
        </div>
      </div>
      <div class="relative min-h-72 overflow-hidden bg-[#d9d5ce] lg:min-h-96">
        <NuxtImg :src="categoryVisual" :alt="label" class="absolute inset-0 size-full object-contain p-8 sm:p-12" sizes="(max-width: 1023px) 100vw, 620px" loading="eager" />
        <div class="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
        <span class="absolute bottom-5 left-5 ink-label text-white/75">INKMADE / BASES</span>
      </div>
    </div>

    <div v-if="!pending && count > 1" class="flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="ink-label text-ink-text-muted">{{ $t(categoryCountKey(filtered.length), { n: filtered.length }) }}</p>
      <div class="flex items-center gap-2 sm:shrink-0">
        <UInput
          v-model="query"
          size="sm"
          icon="i-lucide-search"
          :placeholder="$t('catalog.searchPlaceholder')"
          :aria-label="$t('catalog.searchPlaceholder')"
          class="min-w-0 flex-1 sm:w-52 sm:flex-none"
        />
        <USelect
          v-model="sort"
          :items="sortItems"
          size="sm"
          variant="outline"
          icon="i-lucide-arrow-up-down"
          :aria-label="$t('catalog.sort.label')"
          class="w-44"
        />
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

    <div v-else-if="productsError" class="border border-ink-error/40 bg-ink-error/10 p-6" role="alert">
      <p class="font-semibold text-ink-text">{{ $t('errorPage.genericTitle') }}</p>
      <p class="mt-1 text-sm text-ink-text-soft">{{ $t('errorPage.genericText') }}</p>
      <UButton class="mt-4" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" :loading="retrying" @click="retryProducts">{{ $t('states.retry') }}</UButton>
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
