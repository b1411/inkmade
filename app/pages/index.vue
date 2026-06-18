<script setup lang="ts">
// Лендинг (§5). Премиальный стрит-минимализм: ритм тёмных/светлых секций,
// крупный воздух, появление при скролле (UiReveal). Бизнес-логика — B2C self-service.
const { t } = useI18n()
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

// JSON-LD (P3.20): организация для поисковой выдачи и соцпревью.
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'INKMADE',
      url: site,
      description: 'Платформа кастомизации одежды с печатью по требованию. Казахстан.',
      areaServed: 'KZ',
    }),
  }],
})

const { listAll } = useCatalog()
const { data: examples } = await useAsyncData('landing-examples', () => listAll())

const { listActive } = useCategories()
const { data: categories } = await useAsyncData('landing-categories', () => listActive())
</script>

<template>
  <div>
    <LandingHero />
    <LandingTrustBar />

    <!-- лента примеров -->
    <UiReveal v-if="examples?.length">
      <section style="padding-block: var(--section-pad)">
        <LandingExamplesMarquee :items="examples" />
      </section>
    </UiReveal>

    <!-- каталог-превью «Выбери основу» (§5.4) -->
    <UiReveal v-if="categories?.length">
      <section style="padding-block: var(--section-pad)" aria-labelledby="cat-heading">
        <UiSectionLabel accent>{{ $t('landing.categories.label') }}</UiSectionLabel>
        <h2 id="cat-heading" class="ink-display text-h2 mt-2">{{ $t('landing.categories.title') }}</h2>
        <p class="text-lead text-ink-gray-600 mt-3 mb-8">
          {{ $t('landing.categories.subtitle') }}
        </p>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <UiReveal v-for="(c, i) in categories" :key="c.id" :delay="i * 60">
            <UiAppCard :to="`/catalog/${c.slug}`" hover class="h-full">
              <div class="p-6 flex flex-col items-center gap-3 text-center">
                <UIcon :name="c.icon ?? 'i-lucide-package'" class="size-9 text-ink-burgundy" />
                <span class="font-semibold">{{ c.title }}</span>
              </div>
            </UiAppCard>
          </UiReveal>
        </div>
        <div class="mt-8">
          <UiAppButton to="/catalog" variant="ghost" trailing-icon="i-lucide-arrow-right">
            {{ $t('landing.categories.viewAll') }}
          </UiAppButton>
        </div>
      </section>
    </UiReveal>

    <LandingMethods />

    <section style="padding-block: var(--section-pad)">
      <LandingHowItWorks />
    </section>

    <section style="padding-block: var(--section-pad)">
      <LandingTrust />
    </section>

    <LandingDesignersTeaser />

    <UiReveal>
      <section style="padding-block: var(--section-pad)">
        <LandingFaq />
      </section>
    </UiReveal>

    <LandingFinalCta />
  </div>
</template>
