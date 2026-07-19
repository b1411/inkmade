<script setup lang="ts">
const { t, locale } = useI18n()
const { listActive } = useCategories()
const { listAll } = useCatalog()
onMounted(() => useAnalytics().catalogView())

useSeoMeta({
  title: t('catalog.pageTitle'),
  description: t('catalog.index.subtitle'),
  ogTitle: t('catalog.pageTitle'),
  ogDescription: t('catalog.index.subtitle')
})

const [
  { data: categories, error: categoriesError, refresh: refreshCategories },
  { data: products, error: productsError, refresh: refreshProducts },
] = await Promise.all([
  useAsyncData('catalog-categories', () => listActive()),
  useAsyncData('catalog-all-products', () => listAll())
])
const catalogLoadError = computed(() => categoriesError.value || productsError.value)
const retrying = ref(false)
async function retryCatalog() {
  retrying.value = true
  try {
    await Promise.all([refreshCategories(), refreshProducts()])
  } finally {
    retrying.value = false
  }
}

type CatalogProduct = NonNullable<Awaited<ReturnType<typeof listAll>>>[number]
// Фолбэки — ТОЛЬКО для локальной разработки без засеянной БД. В проде мёртвые карточки
// недопустимы: их ссылки на /product/{slug} и /customize/{alias} дают 404, если слага
// нет в БД. В проде секция показывает только реальные опубликованные товары.
const fallbackProducts = computed<CatalogProduct[]>(() => (import.meta.dev ? [
  { id: 'fallback-oversize', slug: 'tshirt_oversize', alias: 'tshirt_oversize', title: locale.value === 'kk' ? 'Oversize футболка' : 'Футболка Oversize', base_price: 9990, category: 'textile', is_featured: true, created_at: '2026-01-04', product_images: [] },
  { id: 'fallback-classic', slug: 'tshirt', alias: 'tshirt', title: locale.value === 'kk' ? 'Classic футболка' : 'Футболка Classic', base_price: 6990, category: 'textile', is_featured: false, created_at: '2026-01-03', product_images: [] },
  { id: 'fallback-sweatshirt', slug: 'sweatshirt', alias: 'sweatshirt', title: locale.value === 'kk' ? 'Relaxed свитшот' : 'Свитшот Relaxed', base_price: 9990, category: 'textile', is_featured: false, created_at: '2026-01-03', product_images: [] },
  { id: 'fallback-hoodie', slug: 'hoodie', alias: 'hoodie', title: locale.value === 'kk' ? 'Oversize худи' : 'Худи Oversize', base_price: 11990, category: 'textile', is_featured: false, created_at: '2026-01-02', product_images: [] },
  { id: 'fallback-cap', slug: 'cap', alias: 'cap', title: locale.value === 'kk' ? 'INKMADE кепкасы' : 'Кепка INKMADE', base_price: 5990, category: 'textile', is_featured: false, created_at: '2026-01-02', product_images: [] },
  { id: 'fallback-polo', slug: 'polo', alias: 'polo', title: locale.value === 'kk' ? 'Relaxed поло' : 'Поло Relaxed', base_price: 8990, category: 'textile', is_featured: false, created_at: '2026-01-01', product_images: [] },
  { id: 'fallback-tote', slug: 'tote', alias: 'tote', title: locale.value === 'kk' ? 'Canvas шоппері' : 'Шоппер Canvas', base_price: 4990, category: 'accessories', is_featured: false, created_at: '2026-01-01', product_images: [] },
] : []))
const baseOrder = ['tshirt_oversize', 'tshirt', 'sweatshirt', 'hoodie', 'polo', 'cap', 'tote']
const showcaseProducts = computed(() => {
  const live = products.value ?? []
  return [...live, ...fallbackProducts.value.filter(fallback => !live.some(product => product.slug === fallback.slug))]
    .sort((a, b) => {
      const ai = baseOrder.indexOf(a.slug)
      const bi = baseOrder.indexOf(b.slug)
      return (ai === -1 ? baseOrder.length : ai) - (bi === -1 ? baseOrder.length : bi)
    })
})
const catalogCategories = computed(() => categories.value?.length ? categories.value : [{ id: 'textile', slug: 'textile', title: locale.value === 'kk' ? 'Тоқыма' : 'Текстиль', icon: 'i-lucide-shirt' }])

type ProductGroup = 'all' | 'tees' | 'warm' | 'accessories'
type ProductFit = 'all' | 'regular' | 'relaxed' | 'oversize'
const selectedGroup = ref<ProductGroup>('all')
const selectedFit = ref<ProductFit>('all')
const maxPrice = ref(15000)
const sortBy = ref<'editorial' | 'price-asc' | 'price-desc'>('editorial')

const groupBySlug: Record<string, Exclude<ProductGroup, 'all'>> = {
  tshirt: 'tees', tshirt_oversize: 'tees', polo: 'tees',
  sweatshirt: 'warm', hoodie: 'warm', cap: 'accessories', tote: 'accessories',
}
const fitBySlug: Record<string, Exclude<ProductFit, 'all'>> = {
  tshirt: 'regular', tshirt_oversize: 'oversize', polo: 'relaxed',
  sweatshirt: 'relaxed', hoodie: 'oversize', cap: 'regular', tote: 'regular',
}
const filteredProducts = computed(() => {
  const filtered = showcaseProducts.value.filter(product =>
    (selectedGroup.value === 'all' || groupBySlug[product.slug] === selectedGroup.value)
    && (selectedFit.value === 'all' || fitBySlug[product.slug] === selectedFit.value)
    && product.base_price <= maxPrice.value,
  )
  if (sortBy.value === 'price-asc') return [...filtered].sort((a, b) => a.base_price - b.base_price)
  if (sortBy.value === 'price-desc') return [...filtered].sort((a, b) => b.base_price - a.base_price)
  return filtered
})

function resetFilters() {
  selectedGroup.value = 'all'
  selectedFit.value = 'all'
  maxPrice.value = 15000
  sortBy.value = 'editorial'
}

// CTA «Создать свой принт» ведёт в конструктор ПЕРВОЙ реальной базы (alias из БД),
// а не на захардкоженный slug — иначе 404, если алиаса нет в проде. Пусто → в каталог.
const createHref = computed(() => {
  const first = showcaseProducts.value[0]
  return first ? `/customize/${first.alias ?? first.slug}` : '/catalog'
})

const copy = computed(() => locale.value === 'kk'
  ? {
      eyebrow: 'INKMADE / 01—05',
      title: 'Дизайнға арналған негіздер.',
      body: 'Матаны, пішімді және түсті таңда. Принтті келесі қадамда қосасың.',
      products: 'Барлық негіздер',
      note: 'Баға принтсіз көрсетілген',
      results: 'модель',
      groups: { all: 'Барлығы', tees: 'Футболкалар', warm: 'Жылы киім', accessories: 'Аксессуарлар' },
      fits: { all: 'Кез келген пішім', regular: 'Regular', relaxed: 'Relaxed', oversize: 'Oversize' },
      sort: { editorial: 'INKMADE таңдауы', priceAsc: 'Бағасы бойынша ↑', priceDesc: 'Бағасы бойынша ↓' },
      maxPrice: 'Бағасы дейін',
      fitLabel: 'Пішім бойынша сүзгі',
      sortLabel: 'Сұрыптау тәртібі',
      reset: 'Тазарту',
      editorial: 'Бір заттан басып шығарамыз',
      editorialBody: 'Артық өндіріссіз. Тек сен жасаған зат.',
      create: 'Өз принтіңді жасау'
    }
  : {
      eyebrow: 'INKMADE / 01—05',
      title: 'Основы для твоего дизайна.',
      body: 'Выбери ткань, посадку и цвет. Принт добавишь на следующем шаге.',
      products: 'Все основы',
      note: 'Цена указана без принта',
      results: 'моделей',
      groups: { all: 'Все', tees: 'Футболки', warm: 'Тёплый слой', accessories: 'Аксессуары' },
      fits: { all: 'Любая посадка', regular: 'Regular', relaxed: 'Relaxed', oversize: 'Oversize' },
      sort: { editorial: 'Выбор INKMADE', priceAsc: 'Сначала дешевле', priceDesc: 'Сначала дороже' },
      maxPrice: 'Цена до',
      fitLabel: 'Фильтр по посадке',
      sortLabel: 'Порядок сортировки',
      reset: 'Сбросить',
      editorial: 'Печатаем от одной вещи',
      editorialBody: 'Без перепроизводства. Только вещь, которую создал ты.',
      create: 'Создать свой принт'
    })
</script>

<template>
  <div class="space-y-14 pb-8 lg:space-y-20">
    <section class="grid overflow-hidden border border-white/10 bg-ink-raised lg:grid-cols-12" aria-labelledby="catalog-title">
      <div class="flex min-h-[330px] flex-col justify-between p-6 sm:p-10 lg:col-span-5 lg:min-h-[390px]">
        <div>
          <UiSectionLabel inverse>{{ copy.eyebrow }}</UiSectionLabel>
          <h1 id="catalog-title" class="ink-display mt-4 max-w-[8ch] text-[clamp(3rem,6vw,6.6rem)] leading-[.82]">{{ copy.title }}</h1>
          <p class="mt-6 max-w-md text-base text-ink-text-soft sm:text-lg">{{ copy.body }}</p>
        </div>
        <div class="mt-10 flex flex-wrap gap-2">
          <NuxtLink
            v-for="category in catalogCategories"
            :key="category.id"
            :to="`/catalog/${category.slug}`"
            class="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-ink-black"
          >
            <UIcon :name="category.icon ?? 'i-lucide-package'" class="size-4" />
            {{ category.title }}
          </NuxtLink>
        </div>
      </div>

      <div class="group relative min-h-[330px] overflow-hidden lg:col-span-7 lg:min-h-[390px]">
        <NuxtImg src="/media/products/blank/oversize-v01.webp" alt="Футболка Oversize, предметный вид" class="absolute inset-0 size-full bg-[#d9d5ce] object-contain p-8 transition-transform duration-700 group-hover:scale-[1.025] sm:p-12" sizes="(max-width: 1023px) 100vw, 760px" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
        <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[.16em] text-white/55">DROP / BLANK CANVAS</p>
            <p class="ink-display mt-2 max-w-lg text-3xl text-white sm:text-5xl">Начни с чистой формы.</p>
          </div>
          <span class="hidden border border-white/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[.14em] text-white sm:block">ALMATY / KZ</span>
        </div>
      </div>
    </section>

    <section aria-labelledby="catalog-products-title">
      <div class="mb-7 flex items-end justify-between gap-5 border-b border-white/10 pb-5">
        <div>
          <UiSectionLabel inverse>02 / BASES</UiSectionLabel>
          <h2 id="catalog-products-title" class="ink-display mt-2 text-h2">{{ copy.products }}</h2>
        </div>
        <p class="hidden font-mono text-[10px] uppercase tracking-[.12em] text-white/45 sm:block">{{ filteredProducts.length }} {{ copy.results }} · {{ copy.note }}</p>
      </div>

      <div class="mb-7 border border-white/10 bg-ink-raised p-3 sm:p-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="group in (['all', 'tees', 'warm', 'accessories'] as const)"
            :key="group"
            type="button"
            class="min-h-10 border px-3 text-xs font-semibold transition-colors"
            :class="selectedGroup === group ? 'border-ink-burgundy bg-ink-burgundy text-ink-bone' : 'border-white/15 text-ink-text-soft hover:border-white/40 hover:text-ink-text'"
            @click="selectedGroup = group"
          >{{ copy.groups[group] }}</button>

          <select v-model="selectedFit" :aria-label="copy.fitLabel" class="min-h-10 border border-white/15 bg-ink-panel px-3 text-xs text-ink-text outline-none focus:border-ink-burgundy">
            <option v-for="fit in (['all', 'regular', 'relaxed', 'oversize'] as const)" :key="fit" :value="fit">{{ copy.fits[fit] }}</option>
          </select>
          <select v-model="sortBy" :aria-label="copy.sortLabel" class="min-h-10 border border-white/15 bg-ink-panel px-3 text-xs text-ink-text outline-none focus:border-ink-burgundy">
            <option value="editorial">{{ copy.sort.editorial }}</option>
            <option value="price-asc">{{ copy.sort.priceAsc }}</option>
            <option value="price-desc">{{ copy.sort.priceDesc }}</option>
          </select>
          <label class="ml-auto flex min-h-10 items-center gap-3 border border-white/15 px-3 text-xs text-ink-text-soft">
            <span>{{ copy.maxPrice }} {{ formatPrice(maxPrice) }}</span>
            <input v-model.number="maxPrice" type="range" min="6000" max="15000" step="1000" class="w-28 accent-[var(--color-ink-burgundy)]">
          </label>
          <button type="button" class="min-h-10 px-3 text-xs font-semibold text-ink-text-muted hover:text-ink-text" @click="resetFilters">{{ copy.reset }}</button>
        </div>
      </div>

      <div v-if="catalogLoadError" class="border border-ink-error/40 bg-ink-error/10 p-6" role="alert">
        <p class="font-semibold text-ink-text">{{ $t('errorPage.genericTitle') }}</p>
        <p class="mt-1 text-sm text-ink-text-soft">{{ $t('errorPage.genericText') }}</p>
        <UButton class="mt-4" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" :loading="retrying" @click="retryCatalog">
          {{ $t('states.retry') }}
        </UButton>
      </div>
      <div v-else-if="filteredProducts.length" class="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <UiReveal v-for="(product, index) in filteredProducts" :key="product.id" :delay="Math.min(index * 55, 330)">
          <CatalogProductCard :product="product" :badge="product.is_featured ? 'INK PICK' : undefined" />
        </UiReveal>
      </div>
      <UiEmptyState v-else icon="i-lucide-filter-x" :title="$t('states.empty')" class="border border-white/10 bg-ink-raised py-16" />
    </section>

    <section class="grid overflow-hidden border border-white/10 bg-ink-panel lg:grid-cols-12">
      <div class="flex flex-col justify-center p-6 sm:p-10 lg:col-span-5">
        <UiSectionLabel inverse>03 / PRINT ON DEMAND</UiSectionLabel>
        <h2 class="ink-display mt-3 text-h2">{{ copy.editorial }}</h2>
        <p class="mt-4 max-w-md text-ink-text-soft">{{ copy.editorialBody }}</p>
        <UiAppButton :to="createHref" variant="primary" size="lg" class="mt-7 self-start" trailing-icon="i-lucide-arrow-right">
          {{ copy.create }}
        </UiAppButton>
      </div>
      <div class="relative min-h-[300px] lg:col-span-7">
        <NuxtImg src="/media/campaigns/audience-community-v03.webp" alt="Сообщество INKMADE в Алматы" class="absolute inset-0 size-full object-cover object-center" sizes="(max-width: 1023px) 100vw, 760px" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-panel/50 to-transparent" />
      </div>
    </section>
  </div>
</template>
