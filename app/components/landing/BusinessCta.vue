<script setup lang="ts">
// B2B-магазины на главной (Фаза B1). Заметная секция «магазин мерча для команды» —
// то, чего у конкурентов на главной нет (см. docs/B2B_SHOPS_PLAN.md, исследование).
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
  <section aria-labelledby="biz-heading" style="scroll-margin-top: 96px">
    <div class="relative overflow-hidden rounded-3xl border border-ink-cream-dark bg-ink-cream/40 ink-grain">
      <!-- декоративный бордовый ореол -->
      <div class="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-ink-burgundy/10 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-ink-burgundy/10 blur-3xl" />

      <div class="relative px-6 py-14 sm:px-12 lg:px-16">
        <UiReveal>
          <div class="max-w-3xl">
            <UiSectionLabel accent>{{ $t('business.cta.label') }}</UiSectionLabel>
            <h2 id="biz-heading" :key="locale" class="ink-display text-h2 mt-2">{{ $t('business.cta.title') }}</h2>
            <p class="text-lead text-ink-gray-600 mt-4">{{ $t('business.cta.subtitle') }}</p>
          </div>
        </UiReveal>

        <!-- 3 шага -->
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <UiReveal v-for="(s, i) in steps" :key="i" :delay="i * 90">
            <div class="flex h-full flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="flex size-11 items-center justify-center rounded-full bg-ink-burgundy text-ink-cream shrink-0">
                  <UIcon :name="s.icon" class="size-5" />
                </span>
                <span class="font-mono text-caption text-ink-gray-400">0{{ i + 1 }}</span>
              </div>
              <h3 class="font-bold text-h3">{{ s.title }}</h3>
              <p class="text-ink-gray-600">{{ s.text }}</p>
            </div>
          </UiReveal>
        </div>

        <!-- value-props -->
        <UiReveal :delay="120">
          <ul class="mt-10 flex flex-wrap gap-2.5">
            <li
              v-for="(p, i) in props"
              :key="i"
              class="inline-flex items-center gap-2 rounded-full border border-ink-cream-dark bg-ink-white px-4 py-2 text-caption font-semibold"
            >
              <UIcon :name="p.icon" class="size-4 text-ink-burgundy" />
              {{ p.text }}
            </li>
          </ul>
        </UiReveal>

        <UiReveal :delay="160">
          <div class="mt-10 flex flex-wrap items-center gap-4">
            <UiAppButton to="/business" variant="primary" size="lg" trailing-icon="i-lucide-arrow-right" magnetic>
              {{ $t('business.cta.action') }}
            </UiAppButton>
            <span class="text-caption text-ink-gray-400">{{ $t('business.cta.note') }}</span>
          </div>
        </UiReveal>
      </div>
    </div>
  </section>
</template>
