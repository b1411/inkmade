<script setup lang="ts">
// Главная — структура по спеке §7. Порядок блоков там назван «точным», поэтому
// секции идут именно в нём: Top bar → Header (оба в layouts/default.vue) → Hero →
// Trust strip → Выбери основу → Создай свой дизайн → [Идеи] → Как это работает →
// [Премиальное качество] → [Для команд] → Footer.
//
// Снято в Фазе 3 как прямо запрещённое §7:
//  • LandingMethods — «техническое перечисление DTG/DTF» (строки так и назывались:
//    «(Метод DTG — прямая цифровая печать)»).
//  • LandingSocialProof — «отзывы без реальных клиентов». Подзаголовок обещал
//    «реальные кадры наших клиентов», которых нет: это ещё и §19.2 о правдивости.
//  • LandingExamplesMarquee — §21 запрещает автоматическое горизонтальное движение,
//    а показывала она mock-SVG вместо фото. Её роль (товары на главной) забрал
//    блок «Выбери основу» — он же и есть блок 5 структуры.
// Компоненты удалены; строки в i18n оставлены — если блок решат вернуть, текст цел.
//
// Оставлены Trust / Faq / FinalCta: в перечне §7 их нет, но и в списке запрещённого
// тоже — а тест §33 они проходят («доказывает качество» и «помогает оформить заказ»).
//
// НЕ добавлены, потому что упираются в контент, а не в вёрстку (§44.2):
//  • «Идеи для твоего принта» (§14) — нужны 6 кадров idea-*, их нет;
//  • «Премиальное качество» (§16) — нужны 4 макро quality-*, их нет.
// Ставить их на заглушках = 10 пустых плашек на главной; §46.1 прямо называет это
// признаком «не прорывного» дизайна.
import { FEATURES } from '~~/shared/config/features'
const { t } = useI18n()
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

// §12.1: ровно 4 равные карточки основы. Витринный товар первым, дальше по цене —
// так дешёвый вход виден сразу, а не теряется. Прежняя версия блока висела на
// категориях и была скрыта условием «категорий ≥ 3»: в базе категория одна, и
// блок 5 структуры просто не показывался — главная жила вообще без товаров.
const bases = computed(() =>
  [...(products.value ?? [])]
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.base_price - b.base_price)
    .slice(0, 4),
)

function image(p: { product_images?: { url: string, is_primary: boolean }[] | null }) {
  const imgs = p.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
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
        <UiReveal v-if="bases.length">
          <section style="padding-block: var(--section-pad)" aria-labelledby="bases-heading">
            <div class="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <UiSectionLabel accent>{{ $t('landing.categories.label') }}</UiSectionLabel>
                <h2 id="bases-heading" class="ink-display text-h2 mt-2">
                  {{ $t('landing.categories.title') }}
                </h2>
                <p class="text-lead text-ink-text-soft mt-3">
                  {{ $t('landing.categories.subtitle') }}
                </p>
              </div>
              <UiAppButton to="/catalog" variant="secondary" size="md" on-dark trailing-icon="i-lucide-arrow-right">
                {{ $t('landing.categories.viewAll') }}
              </UiAppButton>
            </div>

            <!-- gap 8px (§12.1). bg-ink-card перебивает Paper из .app-card:
                 утилита лежит в слое utilities, он идёт после base. -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <UiReveal v-for="(p, i) in bases" :key="p.id" :delay="i * 60">
                <UiAppCard :to="`/catalog/${p.slug}`" hover class="group h-full bg-ink-card">
                  <div class="app-card-media">
                    <NuxtImg
                      v-if="image(p)"
                      :src="image(p)"
                      :alt="p.title"
                      format="webp"
                      sizes="(max-width: 1024px) 50vw, 340px"
                      class="w-full aspect-[4/3] object-contain p-3"
                    />
                    <div v-else class="w-full aspect-[4/3] grid place-items-center text-ink-text-dark/20">
                      <UIcon name="i-lucide-shirt" class="size-12" />
                    </div>
                  </div>
                  <div class="px-4 pb-4">
                    <h3 class="text-ink-text-dark font-semibold transition-colors group-hover:text-ink-burgundy">
                      {{ p.title }}
                    </h3>
                    <p class="text-caption text-ink-text-dark-soft mt-1">
                      {{ $t('landing.categories.priceFrom', { price: fmtNum(p.base_price) }) }}
                    </p>
                  </div>
                </UiAppCard>
              </UiReveal>
            </div>
          </section>
        </UiReveal>
      </div>
    </div>

    <!-- 6. «Создай свой дизайн» — главный дифференциатор B2C -->
    <LandingConstructor />

    <!-- 7. «Идеи для твоего принта» — ждёт кадры idea-* (§14), см. шапку файла. -->

    <!-- 8. «Как это работает» — Bone (§3.4) -->
    <div class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark">
      <div class="mx-auto max-w-(--container-max) px-4">
        <section style="padding-block: var(--section-pad)">
          <LandingHowItWorks />
        </section>

        <!-- 9. «Премиальное качество» — ждёт макро quality-* (§16). Пока эту роль
             частично держит «Почему мы» ниже. -->
        <section style="padding-block: var(--section-pad)">
          <LandingTrust />
        </section>

        <UiReveal>
          <section style="padding-block: var(--section-pad)">
            <LandingFaq />
          </section>
        </UiReveal>
      </div>
    </div>

    <!-- 10. «Для команд и брендов» (§17) — воронка уведена в шапку отдельной
         кнопкой «Для компаний» → /business, чтобы лендинг вёл один B2C-сценарий.
         Это решение владельца, и §7 ему противоречит: блок 10 там есть. Не трогаю
         в одностороннем порядке — возврат = раскомментировать строку. -->
    <!-- <LandingBusinessCta v-if="FEATURES.b2bShops" /> -->

    <!-- Блок дизайнеров скрыт за фиче-флагом (см. shared/config/features.ts) -->
    <LandingDesignersTeaser v-if="FEATURES.designerMarketplace" />

    <!-- Финальный призыв -->
    <LandingFinalCta />
  </div>
</template>

