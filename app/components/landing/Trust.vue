<script setup lang="ts">
// «Почему INKMADE» (§5.7): честные преимущества без выдуманных цифр/отзывов.
// Bento-сетка: левая высокая акцент-карточка (бордо) — главный УТП «тираж от одной
// штуки», три hairline-карточки вокруг, крупные порядковые номера 01–04.
const { t, locale } = useI18n()
const icons = ['i-lucide-package', 'i-lucide-pipette', 'i-lucide-shield-check', 'i-lucide-lock']

// Раскладка bento (lg): акцент слева на 2 ряда, две сверху-справа, одна широкая снизу.
const layout = [
  { variant: 'accent', cls: 'lg:col-start-1 lg:row-start-1 lg:row-span-2' },
  { variant: 'card', cls: 'lg:col-start-2 lg:row-start-1' },
  { variant: 'card', cls: 'lg:col-start-3 lg:row-start-1' },
  { variant: 'wide', cls: 'lg:col-start-2 lg:row-start-2 lg:col-span-2' },
] as const

const points = computed(() =>
  icons.map((icon, i) => ({
    icon,
    no: String(i + 1).padStart(2, '0'),
    variant: layout[i]!.variant,
    cls: layout[i]!.cls,
    title: t(`landing.trust.points[${i}].title`),
    text: t(`landing.trust.points[${i}].text`),
  })),
)
</script>

<template>
  <section aria-labelledby="trust-heading">
    <UiSectionLabel accent>{{ $t('landing.trust.label') }}</UiSectionLabel>
    <h2 id="trust-heading" :key="locale" v-reveal-text class="ink-display text-h2 mt-2 mb-8">{{ $t('landing.trust.title') }}</h2>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
      <UiReveal v-for="(p, i) in points" :key="p.title" :delay="i * 70" :class="p.cls">
        <!-- Акцент: высокая бордо-карточка (главный УТП) -->
        <div
          v-if="p.variant === 'accent'"
          class="group relative h-full overflow-hidden rounded-2xl bg-ink-burgundy p-7 sm:p-8 text-ink-cream flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-26px_rgba(90,20,40,0.6)]"
        >
          <div class="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-ink-cream/10 blur-3xl transition-transform duration-500 group-hover:scale-125" />
          <div class="relative flex items-start justify-between">
            <span class="inline-flex size-12 items-center justify-center rounded-xl bg-ink-cream/15 ring-1 ring-inset ring-ink-cream/20">
              <UIcon :name="p.icon" class="size-6" />
            </span>
            <span class="ink-display text-5xl leading-none text-ink-cream/25 select-none">{{ p.no }}</span>
          </div>
          <div class="relative mt-10">
            <h3 class="ink-display text-h2">{{ p.title }}</h3>
            <p class="text-ink-cream/80 mt-3 max-w-xs">{{ p.text }}</p>
          </div>
        </div>

        <!-- Широкая нижняя карточка: горизонтальная композиция -->
        <div
          v-else-if="p.variant === 'wide'"
          class="group relative h-full overflow-hidden rounded-2xl border border-ink-gray-200/70 bg-ink-white p-6 sm:p-7 flex items-center gap-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink-burgundy/30 hover:shadow-[0_18px_40px_-24px_rgba(90,20,40,0.35)]"
        >
          <span class="shrink-0 inline-flex size-12 items-center justify-center rounded-xl bg-ink-burgundy/8 text-ink-burgundy transition-colors group-hover:bg-ink-burgundy/15">
            <UIcon :name="p.icon" class="size-6" />
          </span>
          <div class="min-w-0">
            <h3 class="text-h3 font-semibold">{{ p.title }}</h3>
            <p class="text-caption text-ink-gray-600 mt-1">{{ p.text }}</p>
          </div>
          <span class="ink-display ml-auto pl-4 text-4xl leading-none text-ink-gray-200 transition-colors group-hover:text-ink-burgundy/20 select-none">{{ p.no }}</span>
        </div>

        <!-- Обычная hairline-карточка -->
        <div
          v-else
          class="group relative h-full overflow-hidden rounded-2xl border border-ink-gray-200/70 bg-ink-white p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ink-burgundy/30 hover:shadow-[0_18px_40px_-24px_rgba(90,20,40,0.35)]"
        >
          <span class="ink-display absolute right-5 top-4 text-3xl leading-none text-ink-gray-200 transition-colors group-hover:text-ink-burgundy/25 select-none">{{ p.no }}</span>
          <span class="inline-flex size-12 items-center justify-center rounded-xl bg-ink-burgundy/8 text-ink-burgundy transition-colors group-hover:bg-ink-burgundy/15">
            <UIcon :name="p.icon" class="size-6" />
          </span>
          <h3 class="text-h3 font-semibold mt-5">{{ p.title }}</h3>
          <p class="text-caption text-ink-gray-600 mt-2">{{ p.text }}</p>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
