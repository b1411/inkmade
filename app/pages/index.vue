<script setup lang="ts">
// Лендинг (§5). Премиальный стрит-минимализм: ритм тёмных/светлых секций,
// крупный воздух, появление при скролле (UiReveal). Бизнес-логика — B2C self-service.
import { FEATURES } from '~~/shared/config/features'
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
    <!-- 1. Hero + полоса доверия: иммерсивный тёмный вход -->
    <LandingHero />
    <LandingTrustBar />

    <!-- 2. Конструктор — главный дифференциатор, показываем сразу (тёмная секция) -->
    <LandingConstructor />

    <!-- 3. «Как это работает»: снимаем страх перед новым механизмом -->
    <section style="padding-block: var(--section-pad)">
      <LandingHowItWorks />
    </section>

    <!-- 3.5. B2B-магазины для команд (§B1). За флагом b2bShops — differentiator, которого
         у конкурентов на главной нет. Ведёт на посадочную /business с формой заявки. -->
    <UiReveal v-if="FEATURES.b2bShops">
      <section style="padding-block: var(--section-pad)">
        <LandingBusinessCta />
      </section>
    </UiReveal>

    <!-- 4. «Выбери основу» — точка входа в каталог (§5.4).
         Скрыто, пока категорий < 3: пустая/одиночная сетка выглядит «недоделанной»
         и вредит премиальности больше, чем отсутствие секции. Вернётся само, как
         только в БД появятся ≥3 активных категории. -->
    <UiReveal v-if="(categories?.length ?? 0) >= 3">
      <section style="padding-block: var(--section-pad)" aria-labelledby="cat-heading">
        <UiSectionLabel accent>{{ $t('landing.categories.label') }}</UiSectionLabel>
        <h2 id="cat-heading" class="ink-display text-h2 mt-2">{{ $t('landing.categories.title') }}</h2>
        <p class="text-lead text-ink-gray-600 mt-3 mb-8">
          {{ $t('landing.categories.subtitle') }}
        </p>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <UiReveal v-for="(c, i) in categories" :key="c.id" :delay="i * 60">
            <UiAppCard :to="`/catalog/${c.slug}`" hover class="group h-full">
              <div class="app-card-media">
                <UiMediaSlot
                  kind="image"
                  ratio="1/1"
                  tone="light"
                  fit="contain"
                  :icon="c.icon ?? 'i-lucide-package'"
                  rounded="rounded-none"
                />
              </div>
              <div class="p-4 text-center">
                <span class="font-semibold transition-colors group-hover:text-ink-burgundy">{{ c.title }}</span>
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

    <!-- 5. Технологии печати — техническая достоверность (тёмная секция) -->
    <LandingMethods />

    <!-- 6. «Почему мы» — снимаем возражения -->
    <section style="padding-block: var(--section-pad)">
      <LandingTrust />
    </section>

    <!-- 7. Галерея примеров — социальное доказательство (если есть товары) -->
    <UiReveal v-if="examples?.length">
      <section style="padding-block: var(--section-pad)">
        <LandingExamplesMarquee :items="examples" />
      </section>
    </UiReveal>

    <!-- 8. «Носят INKMADE» — соц-доказательство (UGC + Instagram), placeholder-first -->
    <LandingSocialProof />

    <!-- Блок дизайнеров скрыт за фиче-флагом (см. shared/config/features.ts) -->
    <LandingDesignersTeaser v-if="FEATURES.designerMarketplace" />

    <!-- 9. FAQ -->
    <UiReveal>
      <section style="padding-block: var(--section-pad)">
        <LandingFaq />
      </section>
    </UiReveal>

    <!-- 10. Финальный призыв -->
    <LandingFinalCta />
  </div>
</template>
