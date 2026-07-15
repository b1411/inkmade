<script setup lang="ts">
// Посадочная B2B «INKMADE для команд». Расширенная подача + FAQ + вход в self-serve
// открытие магазина. Публичная; гейт роута — feature-flags middleware (404 при
// выключенном b2bShops). Форма заявки (shop_applications + админ-approve + claim-ссылка)
// заменена прямым созданием магазина владельцем: /shop-new → RPC create_my_shop (0086).
const { t, locale } = useI18n()
const user = useSupabaseUser()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade.kz'

// гость → логин с возвратом на форму создания (login/register пробрасывают ?redirect)
const startTo = computed(() => (user.value ? '/shop-new' : '/login?redirect=/shop-new'))

// у вошедшего владельца магазин уже может быть — тогда ведём в кабинет, а не на создание
const { getMine } = useMyShop()
const { data: myShop } = await useAsyncData(
  'business-my-shop',
  () => (user.value ? getMine() : Promise.resolve(null)),
  { watch: [user] },
)

useSeoMeta({
  title: t('business.seo.title'),
  description: t('business.seo.description'),
  ogTitle: t('business.seo.title'),
  ogDescription: t('business.seo.description'),
  ogType: 'website',
  ogUrl: `${site}/business`,
})

const steps = computed(() => [0, 1, 2].map(i => ({
  icon: ['i-lucide-send', 'i-lucide-store', 'i-lucide-truck'][i],
  title: t(`business.cta.steps[${i}].title`),
  text: t(`business.cta.steps[${i}].text`),
})))

const benefits = computed(() => [0, 1, 2, 3, 4, 5].map(i => ({
  icon: ['i-lucide-wallet', 'i-lucide-package-open', 'i-lucide-palette', 'i-lucide-percent', 'i-lucide-shield-check', 'i-lucide-bar-chart-3'][i],
  title: t(`business.benefits[${i}].title`),
  text: t(`business.benefits[${i}].text`),
})))

const faq = computed(() => [0, 1, 2, 3, 4].map(i => ({
  q: t(`business.faq.items[${i}].q`),
  a: t(`business.faq.items[${i}].a`),
})))

const startPoints = computed(() => [0, 1, 2].map(i => t(`business.start.points[${i}]`)))
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream relative overflow-hidden">
      <div class="absolute inset-0 m-auto size-[36rem] rounded-full bg-ink-burgundy/25 blur-3xl ink-ambient-a" />
      <div class="relative mx-auto max-w-(--container-max) px-4 text-center" style="padding-block: var(--section-pad)">
        <UiReveal>
          <span class="ink-label text-ink-burgundy-light">{{ $t('business.hero.label') }}</span>
          <h1 :key="locale" class="ink-hero text-hero mt-3">{{ $t('business.hero.title') }}</h1>
          <p class="text-lead mt-5 text-ink-cream/80 max-w-2xl mx-auto">{{ $t('business.hero.subtitle') }}</p>
          <div class="mt-8 flex flex-wrap justify-center gap-4">
            <UiAppButton to="#apply" variant="primary" size="xl" on-dark magnetic>{{ $t('business.hero.cta') }}</UiAppButton>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Как это работает -->
    <section style="padding-block: var(--section-pad)">
      <UiSectionLabel accent>{{ $t('business.how.label') }}</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-10">{{ $t('business.how.title') }}</h2>
      <div class="grid gap-8 md:grid-cols-3">
        <UiReveal v-for="(s, i) in steps" :key="i" :delay="i * 90">
          <div class="flex h-full flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="flex size-12 items-center justify-center rounded-full bg-ink-burgundy text-ink-cream shrink-0">
                <UIcon :name="s.icon" class="size-6" />
              </span>
              <span class="font-mono text-body text-ink-gray-400">0{{ i + 1 }}</span>
            </div>
            <h3 class="font-bold text-h3">{{ s.title }}</h3>
            <p class="text-ink-gray-600">{{ s.text }}</p>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Преимущества -->
    <section style="padding-block: var(--section-pad)">
      <UiSectionLabel accent>{{ $t('business.benefitsLabel') }}</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-10">{{ $t('business.benefitsTitle') }}</h2>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UiReveal v-for="(b, i) in benefits" :key="i" :delay="i * 70">
          <div class="group h-full rounded-2xl border border-ink-cream-dark bg-ink-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink-burgundy/40 hover:shadow-md">
            <span class="flex size-11 items-center justify-center rounded-full bg-ink-burgundy/10 text-ink-burgundy transition-colors group-hover:bg-ink-burgundy group-hover:text-ink-cream">
              <UIcon :name="b.icon" class="size-5" />
            </span>
            <h3 class="font-bold text-h3 mt-4">{{ b.title }}</h3>
            <p class="text-ink-gray-600 mt-2">{{ b.text }}</p>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Открытие магазина (self-serve) + FAQ -->
    <section id="apply" class="w-screen ml-[calc(50%-50vw)] bg-ink-cream/40" style="scroll-margin-top: 80px">
      <div class="mx-auto max-w-(--container-max) px-4 grid gap-12 lg:grid-cols-2 items-start" style="padding-block: var(--section-pad)">
        <UiReveal>
          <div>
            <UiSectionLabel accent>{{ $t('business.start.label') }}</UiSectionLabel>
            <h2 class="ink-display text-h2 mt-2">{{ $t('business.start.title') }}</h2>
            <p class="text-lead text-ink-gray-600 mt-4">{{ $t('business.start.subtitle') }}</p>

            <div class="mt-10 space-y-3">
              <details v-for="(f, i) in faq" :key="i" class="group rounded-xl border border-ink-cream-dark bg-ink-white px-5 py-4">
                <summary class="flex cursor-pointer items-center justify-between gap-3 font-semibold list-none">
                  {{ f.q }}
                  <UIcon name="i-lucide-plus" class="size-4 shrink-0 text-ink-gray-400 transition-transform group-open:rotate-45" />
                </summary>
                <p class="text-ink-gray-600 mt-3">{{ f.a }}</p>
              </details>
            </div>
          </div>
        </UiReveal>

        <UiReveal :delay="80">
          <div class="rounded-2xl border border-ink-cream-dark bg-ink-white p-6 sm:p-8">
            <span class="flex size-14 items-center justify-center rounded-full bg-ink-burgundy text-ink-cream">
              <UIcon name="i-lucide-store" class="size-7" />
            </span>
            <h3 class="ink-display text-h2 mt-5">{{ $t('business.cta.title') }}</h3>

            <ul class="mt-6 space-y-3">
              <li v-for="(p, i) in startPoints" :key="i" class="flex items-start gap-3">
                <UIcon name="i-lucide-check-circle-2" class="size-5 shrink-0 text-ink-success mt-0.5" />
                <span class="text-ink-gray-600">{{ p }}</span>
              </li>
            </ul>

            <!-- владелец с магазином → в кабинет; остальные → создание (гость через логин) -->
            <template v-if="myShop">
              <p class="text-ink-gray-600 mt-6">{{ $t('business.start.hasShop') }}</p>
              <UiAppButton to="/shop-admin" variant="primary" size="lg" block class="mt-3">
                {{ $t('business.start.toCabinet') }}
              </UiAppButton>
            </template>
            <UiAppButton v-else :to="startTo" variant="primary" size="lg" block class="mt-8">
              {{ $t('business.start.action') }}
            </UiAppButton>

            <p class="text-caption text-ink-gray-400 text-center mt-4">{{ $t('business.cta.note') }}</p>
          </div>
        </UiReveal>
      </div>
    </section>
  </div>
</template>
