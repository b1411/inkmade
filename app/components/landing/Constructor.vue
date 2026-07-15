<script setup lang="ts">
// Витрина конструктора (§5) — главный дифференциатор INKMADE: онлайн-редактор
// принта прямо в браузере. Тёмная премиальная секция в духе hero: слева оффер,
// буллеты и CTA, справа крупное медиа-демо (видео-петля работы в конструкторе).
// Placeholder-first: пока видео нет, UiMediaSlot рисует фирменную заглушку.
const { t, locale } = useI18n()
const supabase = useSupabaseClient()
const { data: featured } = await useAsyncData('constructor-featured', async () => {
  const { data } = await supabase
    .from('products')
    .select('alias')
    .eq('is_active', true)
    .not('alias', 'is', null)
    .order('is_featured', { ascending: false }) // витринный товар-герой первым (миграция 0050)
    .limit(1)
    .maybeSingle()
  return data
})
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
const points = computed(() => [0, 1, 2].map(i => t(`landing.constructor.points[${i}]`)))

// Showcase-движение: шторка-вскрытие демо по скроллу + лёгкий параллакс медиа.
// Всё через useScrollFx → автоматический гейт reduced-motion и cleanup.
const root = ref<HTMLElement | null>(null)
const fx = useScrollFx()
onMounted(() => {
  // vue-tsc выводит тип template-ref структурно (конфликт CSSOM с lib.dom) —
  // приводим к именованному HTMLElement на границе, чтобы gsap/scope приняли цель.
  const el = root.value as HTMLElement | null
  if (!el) return
  fx.scope(el, (gsap, _reveal, parallax) => {
    const wipe = el.querySelector('[data-c-wipe]')
    if (wipe) {
      gsap.set(wipe, { yPercent: 0 }) // ставим шторку поверх (под reduced-motion остаётся убранной)
      gsap.to(wipe, {
        yPercent: -101,
        ease: 'power3.inOut',
        duration: 1,
        scrollTrigger: { trigger: el, start: 'top 78%', once: true },
      })
    }
    if (window.matchMedia('(pointer: fine)').matches) {
      parallax('[data-c-media]', el, { y: -8 })
    }
  })
})
</script>

<template>
  <!-- Raised Surface (§3.4): секция должна отделяться от Ink Black-среды, а не
       сливаться с ней — на этом и держится глубина тёмного ритма. -->
  <section ref="root" class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-raised text-ink-text relative overflow-hidden">
    <!-- Бордо-«блобы» дают фирменное свечение на чёрном (контраст с бордо-hero выше). -->
    <div class="absolute -top-24 -left-24 size-96 rounded-full bg-ink-burgundy-light/25 blur-3xl ink-ambient-a" />
    <div class="absolute -bottom-32 -right-20 size-80 rounded-full bg-ink-burgundy/20 blur-3xl ink-ambient-b" />

    <div
      class="relative mx-auto max-w-(--container-max) px-4 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center"
      style="padding-block: var(--section-pad)"
    >
      <!-- Левая колонка: оффер -->
      <UiReveal>
        <UiSectionLabel class="text-ink-cream/60">{{ $t('landing.constructor.label') }}</UiSectionLabel>
        <h2 :key="locale" v-reveal-text class="ink-display text-h2 mt-2">{{ $t('landing.constructor.title') }}</h2>
        <p class="text-lead mt-4 text-ink-cream/85 max-w-xl">{{ $t('landing.constructor.subtitle') }}</p>
        <ul class="mt-6 space-y-3">
          <li v-for="p in points" :key="p" class="flex items-start gap-3">
            <UIcon name="i-lucide-check" class="size-5 shrink-0 text-ink-cream mt-0.5" />
            <span class="text-ink-cream/85">{{ p }}</span>
          </li>
        </ul>
        <div class="mt-8">
          <UiAppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
            {{ $t('landing.constructor.cta') }}
          </UiAppButton>
        </div>
      </UiReveal>

      <!-- Правая колонка: медиа-демо с cover-wipe вскрытием + параллаксом -->
      <UiMediaSlot
        name="constructor.demo"
        ratio="4/3"
        :alt="$t('landing.constructor.title')"
        data-c-media
        class="shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
      >
        <!-- шторка-вскрытие: по умолчанию убрана вверх (reduced-motion сразу видит медиа),
             при движении gsap ставит её поверх и уводит вверх по скроллу -->
        <div
          data-c-wipe
          class="absolute inset-0 bg-ink-black-soft"
          style="transform: translateY(-101%)"
        />
      </UiMediaSlot>
    </div>
  </section>
</template>
