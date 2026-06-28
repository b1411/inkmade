<script setup lang="ts">
// Hero (§5.1): тёмный бордо-фон + grain, двухколоночно — слева заголовок и CTA,
// справа крупное медиа. GSAP timeline входа (§8): лейбл → заголовок по строкам →
// подзаголовок → кнопки (overshoot) → медиа (scale 1.06→1). Параллакс медиа при
// скролле. Всё под гейтом reduced-motion; начальное скрытие — класс .hero-anim.
import { FEATURES } from '~~/shared/config/features'

const { t } = useI18n()
const supabase = useSupabaseClient()
const { get } = useSettings()

const [{ data: featured }, { data: content }, { data: minPrice }] = await Promise.all([
  useAsyncData('hero-featured', async () => {
    const { data } = await supabase
      .from('products')
      .select('alias')
      .eq('is_active', true)
      .not('alias', 'is', null)
      .order('is_featured', { ascending: false }) // витринный товар для ссылки CTA (миграция 0050)
      .limit(1)
      .maybeSingle()
    return data
  }),
  // CMS-оверрайд заголовка/подзаголовка применяем ТОЛЬКО при включённом контент-
  // редакторе (advancedAdmin). Значение в settings — единая строка без локализации,
  // иначе RU-текст перекрывал бы корректный перевод и на KK. См. shared/config/features.
  useAsyncData('hero-content', async () => {
    if (!FEATURES.advancedAdmin) return { title: null, subtitle: null }
    return {
      title: (await get<string>('landing.hero_title')) ?? null,
      subtitle: (await get<string>('landing.hero_subtitle')) ?? null,
    }
  }),
  // Ценовой якорь «от N ₸»: минимальная базовая цена среди активных товаров.
  // Берём из БД, чтобы цифра всегда была честной и не требовала ручной правки.
  useAsyncData('hero-min-price', async () => {
    const { data } = await supabase
      .from('products')
      .select('base_price')
      .eq('is_active', true)
      .gt('base_price', 0)
      .order('base_price', { ascending: true })
      .limit(1)
      .maybeSingle()
    return data?.base_price ?? null
  }),
])

const heroTitle = computed(() => content.value?.title ?? t('landing.hero.title'))
const heroSubtitle = computed(() => content.value?.subtitle ?? t('landing.hero.subtitle'))
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
// «от N ₸» — пусто, если в БД ещё нет цен (тогда note показывает только логистику).
const priceFrom = computed(() =>
  minPrice.value
    ? t('landing.hero.priceFrom', { price: new Intl.NumberFormat('ru-RU').format(minPrice.value) })
    : '',
)

const root = ref<HTMLElement | null>(null)
const animate = ref(false)
const prefersReduced = useReducedMotion()
let ctx: { revert: () => void } | null = null

onMounted(() => {
  if (prefersReduced.value) return
  const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
  const el = root.value
  if (!gsap || !el) return

  animate.value = true // включаем .hero-anim (начальное скрытие) синхронно перед таймлайном

  ctx = gsap.context(() => {
    const q = (s: string) => Array.from(el.querySelectorAll(s)) as HTMLElement[]
    gsap.set(q('[data-hero-y]'), { y: 24 })
    gsap.set(q('[data-hero-media]'), { scale: 1.04 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(q('[data-hero="label"]'), { opacity: 1, y: 0, duration: 0.5 })
      .to(q('[data-hero="line"]'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, '-=0.2')
      .to(q('[data-hero="sub"]'), { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
      .to(q('[data-hero="cta"]'), { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.25')
      .to(q('[data-hero="note"]'), { opacity: 1, duration: 0.4 }, '-=0.2')
      .to(q('[data-hero-media]'), { opacity: 1, scale: 1, duration: 0.9 }, 0.15)

    // Лёгкий параллакс медиа при скролле — только на не-тач (§5.1, §10).
    if (window.matchMedia('(pointer: fine)').matches) {
      gsap.to(q('[data-hero-media]'), {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      })
    }
  }, el)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section
    ref="root"
    class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden"
    :class="{ 'hero-anim': animate }"
  >
    <!-- мягкий градиент глубины (фолбэк, если WebGL недоступен) -->
    <div class="absolute inset-0 bg-linear-to-br from-ink-burgundy via-ink-burgundy to-ink-burgundy-dark opacity-80" />
    <!-- WebGL «текучий» бордо-фон (Tier 3) — рисуется поверх фолбэка только на десктопе -->
    <UiShaderBackdrop />
    <!-- фоновое фото-лукбук: размыто и приглушено, поверх бордо-фона — атмосфера улицы.
         scale-105 убирает прозрачные края от blur, mix-blend-luminosity тонирует кадр
         под бордо (бренд сохраняется). aria-hidden — чисто декоративный слой. -->
    <img
      src="/media/hero/hero-bg.jpg"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 size-full scale-100 object-cover object-[50%_25%] opacity-75 blur-[3px] mix-blend-luminosity pointer-events-none select-none"
    >
    <!-- бордо-тинт + затемнение слева под заголовок/CTA (контраст текста) -->
    <div class="absolute inset-0 bg-linear-to-r from-ink-burgundy/70 via-ink-burgundy/25 to-ink-burgundy-dark/50" />
    <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl ink-ambient-a" />
    <div class="absolute -bottom-32 -left-20 size-80 rounded-full bg-ink-black/30 blur-3xl ink-ambient-b" />

    <div
      class="relative mx-auto max-w-(--container-max) px-4 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center"
      style="padding-block: clamp(56px, 7vw, 96px)"
    >
      <!-- Левая колонка: текст + CTA -->
      <div>
        <p data-hero="label" data-hero-y class="ink-label text-ink-cream/70">
          {{ $t('landing.hero.label') }}
        </p>
        <h1 data-hero="line" data-hero-y class="ink-hero text-hero mt-4">
          {{ heroTitle }}
        </h1>
        <p data-hero="sub" data-hero-y class="text-lead mt-6 max-w-xl text-ink-cream/85">
          {{ heroSubtitle }}
        </p>
        <div data-hero="cta" data-hero-y class="flex flex-wrap gap-3 mt-8">
          <UiAppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
            {{ $t('landing.hero.createCta') }}
          </UiAppButton>
          <UiAppButton to="/catalog" variant="secondary" size="xl" on-dark>
            {{ $t('landing.hero.catalogCta') }}
          </UiAppButton>
        </div>
        <p data-hero="note" class="ink-label text-ink-cream/55 mt-6">
          <span v-if="priceFrom" class="text-ink-cream/80">{{ priceFrom }} · </span>{{ $t('landing.hero.note') }}
        </p>
      </div>

      <!-- Правая колонка: одно медиа в премиальной «галерейной» рамке -->
      <div
        data-hero="media"
        data-hero-media
        class="relative w-full rounded-2xl bg-white/5 ring-1 ring-white/10 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-[2px] max-w-[460px] lg:ml-auto"
      >
        <UiMediaSlot
          name="hero.main"
          ratio="4/5"
          :alt="$t('landing.hero.imageAlt')"
          :priority="true"
          loading="eager"
          sizes="(max-width: 1024px) 90vw, 440px"
          rounded="rounded-xl"
          class="max-h-[54vh] lg:max-h-[60vh]"
        />
      </div>
    </div>
  </section>
</template>
