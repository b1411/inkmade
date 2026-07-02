<script setup lang="ts">
// B2B-магазины на главной (Фаза B1) — отдельный полноширинный РАЗДЕЛ (бордовая полоса)
// высоко на лендинге: то, чего у конкурентов на главной нет (docs/B2B_SHOPS_PLAN.md).
// Показывается только при FEATURES.b2bShops (гейт в index.vue). Ведёт на /business.
const { t, locale } = useI18n()
const steps = computed(() => [
  { icon: 'i-lucide-send', title: t('business.cta.steps[0].title'), text: t('business.cta.steps[0].text') },
  { icon: 'i-lucide-store', title: t('business.cta.steps[1].title'), text: t('business.cta.steps[1].text') },
  { icon: 'i-lucide-truck', title: t('business.cta.steps[2].title'), text: t('business.cta.steps[2].text') },
])
const props = computed(() => [
  { icon: 'i-lucide-wallet', text: t('business.cta.props[0]') },
  { icon: 'i-lucide-package-open', text: t('business.cta.props[1]') },
  { icon: 'i-lucide-palette', text: t('business.cta.props[2]') },
  { icon: 'i-lucide-percent', text: t('business.cta.props[3]') },
])
</script>

<template>
  <section
    id="business"
    aria-labelledby="biz-heading"
    class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden"
    style="scroll-margin-top: 80px"
  >
    <!-- ambient-фон -->
    <div class="pointer-events-none absolute -top-32 -right-24 size-[32rem] rounded-full bg-ink-burgundy-light/25 blur-3xl ink-ambient-a" />
    <div class="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-ink-black/20 blur-3xl ink-ambient-b" />

    <div class="relative mx-auto max-w-(--container-max) px-4" style="padding-block: var(--section-pad)">
      <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <!-- слева: питч + преимущества + CTA -->
        <UiReveal>
          <div>
            <span class="ink-label text-ink-cream/60">{{ $t('business.cta.label') }}</span>
            <h2 id="biz-heading" :key="locale" class="ink-display text-h1 mt-3">{{ $t('business.cta.title') }}</h2>
            <p class="text-lead text-ink-cream/80 mt-5 max-w-lg">{{ $t('business.cta.subtitle') }}</p>

            <ul class="mt-8 flex flex-wrap gap-2.5">
              <li
                v-for="(p, i) in props"
                :key="i"
                class="inline-flex items-center gap-2 rounded-full border border-ink-cream/20 px-4 py-2 text-caption font-semibold text-ink-cream/90"
              >
                <UIcon :name="p.icon" class="size-4" />
                {{ p.text }}
              </li>
            </ul>

            <div class="mt-9 flex flex-wrap items-center gap-4">
              <NuxtLink
                to="/business"
                class="group inline-flex items-center gap-2 rounded-full bg-ink-cream px-8 py-4 text-lg font-semibold text-ink-burgundy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-white"
              >
                {{ $t('business.cta.action') }}
                <UIcon name="i-lucide-arrow-right" class="size-5 transition-transform group-hover:translate-x-1" />
              </NuxtLink>
              <span class="text-caption text-ink-cream/55">{{ $t('business.cta.note') }}</span>
            </div>
          </div>
        </UiReveal>

        <!-- справа: 3 шага (нумерованные карточки) -->
        <UiReveal :delay="100">
          <div class="space-y-3.5 lg:pt-1">
            <div
              v-for="(s, i) in steps"
              :key="i"
              class="flex gap-4 rounded-2xl border border-ink-cream/10 bg-ink-cream/5 p-5 transition-colors hover:bg-ink-cream/10"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-cream font-mono text-lg font-bold text-ink-burgundy">
                {{ i + 1 }}
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <UIcon :name="s.icon" class="size-4 text-ink-cream/70" />
                  <h3 class="font-bold text-h3">{{ s.title }}</h3>
                </div>
                <p class="text-ink-cream/70 mt-1.5">{{ s.text }}</p>
              </div>
            </div>
          </div>
        </UiReveal>
      </div>
    </div>
  </section>
</template>
