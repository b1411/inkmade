<script setup lang="ts">
// B2B-магазины на главной (Фаза B1) — отдельный полноширинный СВЕТЛЫЙ раздел высоко на
// лендинге (сразу под hero). Слева питч + шаги, справа мини-превью брендированной витрины.
// То, чего у конкурентов на главной нет (docs/B2B_SHOPS_PLAN.md). Гейт b2bShops в index.vue.
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
// демо-товары для мини-превью витрины (визуал, не данные)
const preview = [
  { name: t('business.cta.preview.item1'), price: '7 900 ₸' },
  { name: t('business.cta.preview.item2'), price: '12 500 ₸' },
  { name: t('business.cta.preview.item3'), price: '5 400 ₸' },
]
</script>

<template>
  <section
    id="business"
    aria-labelledby="biz-heading"
    class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-cream/60 relative overflow-hidden"
    style="scroll-margin-top: 80px"
  >
    <!-- ambient-акценты -->
    <div class="pointer-events-none absolute -top-28 -right-20 size-[30rem] rounded-full bg-ink-burgundy/8 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-32 -left-24 size-[24rem] rounded-full bg-ink-burgundy/6 blur-3xl" />

    <div class="relative mx-auto max-w-(--container-max) px-4" style="padding-block: var(--section-pad)">
      <div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <!-- слева: питч -->
        <UiReveal>
          <div>
            <UiSectionLabel accent>{{ $t('business.cta.label') }}</UiSectionLabel>
            <h2 id="biz-heading" :key="locale" class="ink-display text-h1 mt-3">{{ $t('business.cta.title') }}</h2>
            <p class="text-lead text-ink-gray-600 mt-5 max-w-lg">{{ $t('business.cta.subtitle') }}</p>

            <ul class="mt-8 flex flex-wrap gap-2.5">
              <li
                v-for="(p, i) in props"
                :key="i"
                class="inline-flex items-center gap-2 rounded-full border border-ink-cream-dark bg-ink-white px-4 py-2 text-caption font-semibold"
              >
                <UIcon :name="p.icon" class="size-4 text-ink-burgundy" />
                {{ p.text }}
              </li>
            </ul>

            <div class="mt-9 flex flex-wrap items-center gap-4">
              <UiAppButton to="/business" variant="primary" size="lg" trailing-icon="i-lucide-arrow-right" magnetic>
                {{ $t('business.cta.action') }}
              </UiAppButton>
              <span class="text-caption text-ink-gray-400">{{ $t('business.cta.note') }}</span>
            </div>
          </div>
        </UiReveal>

        <!-- справа: мини-превью брендированной витрины -->
        <UiReveal :delay="120">
          <div class="relative">
            <div class="rounded-2xl border border-ink-cream-dark bg-ink-white shadow-xl overflow-hidden rotate-1 transition-transform duration-500 hover:rotate-0">
              <!-- шапка магазина -->
              <div class="flex items-center justify-between border-b border-black/5 px-4 py-3" style="background:#f5f8ff">
                <div class="flex items-center gap-2">
                  <span class="size-6 rounded-md" style="background:#1f6feb" />
                  <span class="font-bold text-sm" style="color:#1f6feb">UIB Store</span>
                </div>
                <span class="text-[10px] text-ink-gray-400">на INKMADE</span>
              </div>
              <!-- hero -->
              <div class="px-4 py-5" style="background:#f5f8ff">
                <div class="h-3.5 w-2/3 rounded" style="background:#1f6feb" />
                <div class="h-2 w-1/2 rounded bg-black/10 mt-2" />
              </div>
              <!-- сетка товаров -->
              <div class="grid grid-cols-3 gap-2.5 p-4">
                <div v-for="(it, i) in preview" :key="i" class="rounded-lg overflow-hidden border border-black/5">
                  <div class="aspect-[3/4] bg-ink-cream/50 flex items-center justify-center">
                    <UIcon name="i-lucide-shirt" class="size-7 text-black/15" />
                  </div>
                  <div class="p-2">
                    <div class="text-[10px] font-semibold leading-tight truncate text-ink-black">{{ it.name }}</div>
                    <div class="text-[10px] font-bold mt-1" style="color:#1f6feb">{{ it.price }}</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- подпись-«ссылка» под мокапом -->
            <div class="mt-3 flex items-center justify-center gap-2 text-caption text-ink-gray-400">
              <UIcon name="i-lucide-link" class="size-3.5" />
              <span class="font-mono">inkmade.kz/s/uib</span>
            </div>
          </div>
        </UiReveal>
      </div>

      <!-- 3 шага (снизу, во всю ширину) -->
      <UiReveal :delay="80">
        <div class="mt-12 grid gap-6 border-t border-ink-cream-dark pt-10 md:grid-cols-3">
          <div v-for="(s, i) in steps" :key="i" class="flex gap-4">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-burgundy font-mono font-bold text-ink-cream">
              {{ i + 1 }}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <UIcon :name="s.icon" class="size-4 text-ink-burgundy" />
                <h3 class="font-bold text-h3">{{ s.title }}</h3>
              </div>
              <p class="text-ink-gray-600 mt-1.5">{{ s.text }}</p>
            </div>
          </div>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
