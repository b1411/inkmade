<script setup lang="ts">
const { t, locale } = useI18n()
const props = computed(() => [
  { icon: 'i-lucide-store', text: t('business.cta.props[0]') },
  { icon: 'i-lucide-package-open', text: t('business.cta.props[1]') },
  { icon: 'i-lucide-palette', text: t('business.cta.props[2]') },
  { icon: 'i-lucide-percent', text: t('business.cta.props[3]') },
])
</script>

<template>
  <section id="business" class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark" aria-labelledby="biz-heading">
    <div class="mx-auto max-w-(--container-max) px-4 py-12 lg:py-16">
      <div class="grid gap-8 lg:grid-cols-12 lg:items-stretch">
        <div class="flex flex-col justify-between lg:col-span-4">
          <div>
            <UiSectionLabel accent>06 / TEAMS & BRANDS</UiSectionLabel>
            <h2 id="biz-heading" class="ink-display text-h1 mt-3">{{ t('business.cta.title') }}</h2>
            <p class="mt-4 max-w-lg text-lead text-ink-gray-600">{{ t('business.cta.subtitle') }}</p>
            <ul class="mt-7 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <li v-for="item in props" :key="item.text" class="flex items-center gap-2 text-sm font-semibold">
                <UIcon :name="item.icon" class="size-4 text-ink-burgundy" />
                {{ item.text }}
              </li>
            </ul>
          </div>
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <UiAppButton to="/business" variant="primary" size="lg" trailing-icon="i-lucide-arrow-right">
              {{ t('business.cta.action') }}
            </UiAppButton>
            <span class="font-mono text-[10px] uppercase tracking-[.12em] text-ink-gray-400">START / 3 DAYS</span>
          </div>
        </div>

        <div class="relative min-h-[390px] overflow-hidden rounded-[4px] bg-ink-black lg:col-span-8">
          <NuxtImg src="/media/campaigns/merch-system-v02.webp" :alt="locale === 'kk' ? 'Командаға арналған қара мерч капсуласы' : 'Чёрная мерч-капсула для команды'" format="webp" sizes="(max-width: 1023px) 100vw, 920px" class="absolute inset-0 size-full object-cover" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
          <div class="absolute left-4 top-4 border border-white/20 bg-black/65 px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-white backdrop-blur">
            TEAM STORE / SYSTEM 001
          </div>

          <div class="absolute bottom-4 right-4 w-[min(310px,calc(100%-2rem))] border border-white/15 bg-black/82 p-4 text-white shadow-2xl backdrop-blur-md">
            <div class="flex items-center justify-between border-b border-white/12 pb-3">
              <div>
                <p class="font-display text-sm font-black">YOUR TEAM / STORE</p>
                <p class="mt-0.5 font-mono text-[9px] text-white/45">inkmade.kz/s/your-team</p>
              </div>
              <span class="size-7 rounded-full bg-ink-burgundy" />
            </div>
            <div class="grid grid-cols-3 gap-2 pt-3">
              <div v-for="(label, i) in ['HOODIE', 'TEE', 'CAP']" :key="label" class="bg-white/7 p-2">
                <UIcon :name="i === 2 ? 'i-lucide-circle-dot' : 'i-lucide-shirt'" class="mx-auto size-7 text-white/55" />
                <p class="mt-2 text-center font-mono text-[8px] text-white/55">{{ label }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 grid overflow-hidden border border-black/10 bg-white md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div class="p-5">
          <p class="font-mono text-[9px] uppercase tracking-[.12em] text-ink-gray-400">{{ locale === 'kk' ? 'Өзіндік құн' : 'Себестоимость' }}</p>
          <p class="mt-1 font-display text-2xl font-black">11 990 ₸</p>
        </div>
        <UIcon name="i-lucide-arrow-right" class="mx-4 hidden size-5 self-center text-ink-gray-400 md:block" />
        <div class="border-t border-black/8 p-5 md:border-l-0 md:border-t-0">
          <p class="font-mono text-[9px] uppercase tracking-[.12em] text-ink-gray-400">{{ locale === 'kk' ? 'Клиент бағасы' : 'Цена для клиента' }}</p>
          <p class="mt-1 font-display text-2xl font-black">19 990 ₸</p>
        </div>
        <UIcon name="i-lucide-arrow-right" class="mx-4 hidden size-5 self-center text-ink-gray-400 md:block" />
        <div class="bg-ink-burgundy p-5 text-white">
          <p class="font-mono text-[9px] uppercase tracking-[.12em] text-white/70">{{ locale === 'kk' ? 'Сіздің пайдаңыз' : 'Ваша прибыль' }}</p>
          <p class="mt-1 font-display text-2xl font-black">8 000 ₸</p>
        </div>
      </div>
    </div>
  </section>
</template>
