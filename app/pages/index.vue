<script setup lang="ts">
// Главная следует редакционной структуре спецификации: hero → основания →
// интерактивный тизер редактора → идеи → editions → процесс → качество → B2B.
// Визуальные секции используют локальный контент и не исчезают при недоступной БД.
import { FEATURES } from '~~/shared/config/features'
const { t, locale } = useI18n()
const { number: fmtNum } = useFormat()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade-pi.vercel.app'

useSeoMeta({
  title: t('landing.seo.title'),
  description: t('landing.seo.description'),
  ogTitle: t('landing.seo.ogTitle'),
  ogDescription: t('landing.seo.ogDescription'),
  ogType: 'website',
  ogUrl: site,
})

// JSON-LD (P3.20): организация + сайт для поисковой выдачи и соцпревью.
// @graph связывает Organization и WebSite (publisher ссылается на @id организации) —
// так Google понимает бренд и сайт как единую сущность.
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${site}/#organization`,
          name: 'INKMADE',
          url: site,
          logo: `${site}/icon-512.png`,
          description: 'Платформа кастомизации одежды с печатью по требованию. Казахстан.',
          areaServed: 'KZ',
        },
        {
          '@type': 'WebSite',
          '@id': `${site}/#website`,
          name: 'INKMADE',
          url: site,
          inLanguage: 'ru-RU',
          publisher: { '@id': `${site}/#organization` },
        },
      ],
    }),
  }],
})

const { listAll } = useCatalog()
const { data: products } = await useAsyncData('landing-products', () => listAll())
type LandingProduct = NonNullable<Awaited<ReturnType<typeof listAll>>>[number]

const fallbackBases = computed<LandingProduct[]>(() => [
  { id: 'fallback-oversize', slug: 'tshirt_oversize', alias: 'tshirt_oversize', title: locale.value === 'kk' ? 'Oversize футболка' : 'Футболка Oversize', base_price: 9990, category: 'tshirts', is_featured: true, created_at: '2026-01-04', product_images: [] },
  { id: 'fallback-classic', slug: 'tshirt', alias: 'tshirt', title: locale.value === 'kk' ? 'Classic футболка' : 'Футболка Classic', base_price: 6990, category: 'tshirts', is_featured: false, created_at: '2026-01-03', product_images: [] },
  { id: 'fallback-cap', slug: 'cap', alias: 'cap', title: locale.value === 'kk' ? 'INKMADE кепкасы' : 'Кепка INKMADE', base_price: 5990, category: 'caps', is_featured: false, created_at: '2026-01-02', product_images: [] },
  { id: 'fallback-polo', slug: 'polo', alias: 'polo', title: locale.value === 'kk' ? 'Relaxed поло' : 'Поло Relaxed', base_price: 8990, category: 'polo', is_featured: false, created_at: '2026-01-01', product_images: [] },
])

const baseOrder = ['tshirt_oversize', 'tshirt', 'cap', 'polo']

// Ровно четыре ключевые основы. Данные каталога имеют приоритет, локальные
// fallback-карточки страхуют витрину от сетевой ошибки и пустой базы.
const bases = computed(() => {
  const live = products.value ?? []
  const source = [...live, ...fallbackBases.value.filter(fallback => !live.some(product => product.slug === fallback.slug))]
  return source
    .sort((a, b) => {
      const ai = baseOrder.indexOf(a.slug)
      const bi = baseOrder.indexOf(b.slug)
      return (ai === -1 ? baseOrder.length : ai) - (bi === -1 ? baseOrder.length : bi)
    })
    .slice(0, 4)
})

function image(p: { product_images?: { url: string, is_primary: boolean }[] | null }) {
  const imgs = p.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}

const blankBySlug: Record<string, string> = {
  tshirt_oversize: '/media/products/blank/oversize-v01.webp',
  tshirt: '/media/products/blank/classic-v01.webp',
  cap: '/media/products/blank/cap-v01.webp',
  polo: '/media/products/blank/polo-v01.webp',
  sweatshirt: '/media/products/blank/sweatshirt-v01.webp',
  hoodie: '/media/products/blank/hoodie-v01.webp',
}

function blankImage(p: LandingProduct) {
  return blankBySlug[p.slug] ?? image(p)
}

const backBySlug: Record<string, string> = {
  tshirt_oversize: '/media/products/back/oversize-back-v01.webp',
  tshirt: '/media/products/back/classic-back-v01.webp',
  cap: '/media/products/back/cap-back-v01.webp',
  polo: '/media/products/back/polo-back-v01.webp',
  sweatshirt: '/media/products/back/sweatshirt-back-v01.webp',
  hoodie: '/media/products/back/hoodie-back-v01.webp',
}

function backImage(slug: string) {
  return backBySlug[slug] ?? '/media/products/back/oversize-back-v01.webp'
}
</script>

<template>
  <div>
    <!-- 3. Hero -->
    <LandingHero />

    <!-- 4. Trust strip -->
    <LandingTrustBar />

    <!-- 5. «Выбери основу» — Surface Black, карточки Warm Card (§3.4, §12) -->
    <div class="w-screen ml-[calc(50%-50vw)] bg-ink-surface text-ink-text">
      <div class="mx-auto max-w-(--container-max) px-4">
        <section v-if="bases.length" class="grid gap-7 py-12 lg:grid-cols-12 lg:py-14" aria-labelledby="bases-heading">
          <UiReveal class="lg:col-span-2">
            <div class="flex h-full flex-col items-start justify-between gap-6">
              <div>
                <UiSectionLabel inverse>01 / BASE</UiSectionLabel>
                <h2 id="bases-heading" class="ink-display text-h2 mt-2">{{ $t('landing.categories.title') }}</h2>
                <p class="mt-3 text-sm text-ink-text-soft">{{ $t('landing.categories.subtitle') }}</p>
              </div>
              <UiAppButton to="/catalog" variant="secondary" size="md" on-dark trailing-icon="i-lucide-arrow-right">
                {{ $t('landing.categories.viewAll') }}
              </UiAppButton>
            </div>
          </UiReveal>

          <div class="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3 lg:col-span-10 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
            <UiReveal v-for="(p, i) in bases" :key="p.id" :delay="i * 60" class="min-w-[78vw] snap-start sm:min-w-[44vw] lg:min-w-0">
              <LandingProductStoryCard
                :to="`/product/${p.slug}`"
                :title="p.title"
                :price="$t('landing.categories.priceFrom', { price: fmtNum(p.base_price) })"
                :blank-src="blankImage(p)"
                :secondary-src="backImage(p.slug)"
              />
            </UiReveal>
          </div>
        </section>
      </div>
    </div>

    <!-- 6. «Создай свой дизайн» — главный дифференциатор B2C -->
    <LandingConstructor />

    <!-- 7. Алматинские команды + редакционные коллекции -->
    <LandingIdeas />
    <LandingEditions />

    <!-- 9. «Как это работает» — Bone (§3.4) -->
    <div class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark">
      <div class="mx-auto max-w-(--container-max) px-4">
        <section class="py-12 lg:py-14">
          <LandingHowItWorks />
        </section>
      </div>
    </div>

    <!-- 10. Премиальное качество -->
    <LandingQuality />

    <!-- 11. Производство и упаковка -->
    <LandingProcess />

    <!-- 12. Полная предметная матрица основ -->
    <LandingSocialProof />

    <!-- 13. Для команд и брендов -->
    <LandingBusinessCta v-if="FEATURES.b2bShops" />

    <!-- Блок дизайнеров скрыт за фиче-флагом (см. shared/config/features.ts) -->
    <LandingDesignersTeaser v-if="FEATURES.designerMarketplace" />

    <!-- Финальный призыв -->
    <LandingFinalCta />
  </div>
</template>

