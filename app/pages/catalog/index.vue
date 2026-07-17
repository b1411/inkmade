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

const [{ data: categories }, { data: products }] = await Promise.all([
  useAsyncData('catalog-categories', () => listActive()),
  useAsyncData('catalog-all-products', () => listAll())
])

type CatalogProduct = NonNullable<Awaited<ReturnType<typeof listAll>>>[number]
const fallbackProducts = computed<CatalogProduct[]>(() => [
  { id: 'fallback-oversize', slug: 'tshirt_oversize', alias: 'tshirt_oversize', title: locale.value === 'kk' ? 'Oversize футболка' : 'Футболка Oversize', base_price: 9990, category: 'textile', is_featured: true, created_at: '2026-01-04', product_images: [] },
  { id: 'fallback-classic', slug: 'tshirt', alias: 'tshirt', title: locale.value === 'kk' ? 'Classic футболка' : 'Футболка Classic', base_price: 6990, category: 'textile', is_featured: false, created_at: '2026-01-03', product_images: [] },
  { id: 'fallback-cap', slug: 'cap', alias: 'cap', title: locale.value === 'kk' ? 'INKMADE кепкасы' : 'Кепка INKMADE', base_price: 5990, category: 'textile', is_featured: false, created_at: '2026-01-02', product_images: [] },
  { id: 'fallback-polo', slug: 'polo', alias: 'polo', title: locale.value === 'kk' ? 'Relaxed поло' : 'Поло Relaxed', base_price: 8990, category: 'textile', is_featured: false, created_at: '2026-01-01', product_images: [] }
])
const baseOrder = ['tshirt_oversize', 'tshirt', 'polo', 'cap']
const showcaseProducts = computed(() => {
  const live = products.value ?? []
  return [...live, ...fallbackProducts.value.filter(fallback => !live.some(product => product.slug === fallback.slug))]
    .sort((a, b) => {
      const ai = baseOrder.indexOf(a.slug)
      const bi = baseOrder.indexOf(b.slug)
      return (ai === -1 ? baseOrder.length : ai) - (bi === -1 ? baseOrder.length : bi)
    })
    .slice(0, 4)
})

const copy = computed(() => locale.value === 'kk'
  ? {
      eyebrow: 'INKMADE / 01—05',
      title: 'Дизайнға арналған негіздер.',
      body: 'Матаны, пішімді және түсті таңда. Принтті келесі қадамда қосасың.',
      products: 'Барлық негіздер',
      note: 'Баға принтсіз көрсетілген',
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
      editorial: 'Печатаем от одной вещи',
      editorialBody: 'Без перепроизводства. Только вещь, которую создал ты.',
      create: 'Создать свой принт'
    })
</script>

<template>
  <div class="space-y-14 pb-8 lg:space-y-20">
    <section class="grid overflow-hidden border border-white/10 bg-ink-raised lg:grid-cols-12" aria-labelledby="catalog-title">
      <div class="flex min-h-[380px] flex-col justify-between p-6 sm:p-10 lg:col-span-5 lg:min-h-[520px]">
        <div>
          <UiSectionLabel inverse>{{ copy.eyebrow }}</UiSectionLabel>
          <h1 id="catalog-title" class="ink-display mt-4 max-w-[8ch] text-[clamp(3rem,6vw,6.6rem)] leading-[.82]">{{ copy.title }}</h1>
          <p class="mt-6 max-w-md text-base text-ink-text-soft sm:text-lg">{{ copy.body }}</p>
        </div>
        <div class="mt-10 flex flex-wrap gap-2">
          <NuxtLink
            v-for="category in categories"
            :key="category.id"
            :to="`/catalog/${category.slug}`"
            class="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-ink-black"
          >
            <UIcon :name="category.icon ?? 'i-lucide-package'" class="size-4" />
            {{ category.title }}
          </NuxtLink>
        </div>
      </div>

      <div class="group relative min-h-[420px] overflow-hidden lg:col-span-7 lg:min-h-[520px]">
        <NuxtImg src="/media/ideas/idea-minimal-v01.webp" alt="Минималистичный образ INKMADE" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" sizes="(max-width: 1023px) 100vw, 760px" />
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
        <p class="hidden font-mono text-[10px] uppercase tracking-[.12em] text-white/45 sm:block">{{ copy.note }}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        <UiReveal v-for="(product, index) in showcaseProducts" :key="product.id" :delay="Math.min(index * 55, 330)">
          <CatalogProductCard :product="product" :badge="product.is_featured ? 'INK PICK' : undefined" />
        </UiReveal>
      </div>
    </section>

    <section class="grid overflow-hidden border border-white/10 bg-ink-panel lg:grid-cols-12">
      <div class="flex flex-col justify-center p-6 sm:p-10 lg:col-span-5">
        <UiSectionLabel inverse>03 / PRINT ON DEMAND</UiSectionLabel>
        <h2 class="ink-display mt-3 text-h2">{{ copy.editorial }}</h2>
        <p class="mt-4 max-w-md text-ink-text-soft">{{ copy.editorialBody }}</p>
        <UiAppButton to="/customize/tshirt_oversize" variant="primary" size="lg" class="mt-7 self-start" trailing-icon="i-lucide-arrow-right">
          {{ copy.create }}
        </UiAppButton>
      </div>
      <div class="relative min-h-[300px] lg:col-span-7">
        <NuxtImg src="/media/ideas/idea-graphic-v01.webp" alt="Графический принт INKMADE" class="absolute inset-0 size-full object-cover" sizes="(max-width: 1023px) 100vw, 760px" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-panel/50 to-transparent" />
      </div>
    </section>
  </div>
</template>
