<script setup lang="ts">
// Hero (§5.1): тёмный бордо-фон + grain, двухколоночно — слева заголовок и CTA,
// справа крупное медиа. GSAP timeline входа (§8): лейбл → заголовок по строкам →
// подзаголовок → кнопки (overshoot) → медиа (scale 1.06→1). Параллакс медиа при
// скролле. Всё под гейтом reduced-motion; начальное скрытие — класс .hero-anim.
const supabase = useSupabaseClient()
const { data: featured } = await useAsyncData('hero-featured', async () => {
  const { data } = await supabase
    .from('products')
    .select('alias, title, product_images(url, is_primary)')
    .eq('is_active', true)
    .not('alias', 'is', null)
    .limit(1)
    .maybeSingle()
  return data
})
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
const heroImage = computed(() => {
  const imgs = (featured.value?.product_images ?? []) as { url: string; is_primary: boolean }[]
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
})

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
    gsap.set(q('[data-hero-media]'), { scale: 1.06 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(q('[data-hero="label"]'), { opacity: 1, y: 0, duration: 0.5 })
      .to(q('[data-hero="line"]'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, '-=0.2')
      .to(q('[data-hero="sub"]'), { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
      .to(q('[data-hero="cta"]'), { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.25')
      .to(q('[data-hero="note"]'), { opacity: 1, duration: 0.4 }, '-=0.2')
      .to(q('[data-hero-media]'), { opacity: 1, scale: 1, duration: 0.9 }, 0.15)

    // Параллакс медиа при скролле — только на не-тач (§5.1, §10)
    if (window.matchMedia('(pointer: fine)').matches) {
      gsap.to(q('[data-hero-media]'), {
        yPercent: -8,
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
    <!-- мягкий градиент глубины -->
    <div class="absolute inset-0 bg-linear-to-br from-ink-burgundy via-ink-burgundy to-ink-burgundy-dark opacity-80" />
    <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl" />
    <div class="absolute -bottom-32 -left-20 size-80 rounded-full bg-ink-black/30 blur-3xl" />

    <div
      class="relative mx-auto max-w-(--container-max) px-4 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center"
      style="padding-block: clamp(96px, 14vw, 160px)"
    >
      <!-- Левая колонка: текст + CTA -->
      <div>
        <p data-hero="label" data-hero-y class="ink-label text-ink-cream/70">
          MERCH STUDIO · ALMATY · EST. 2025
        </p>
        <h1 class="ink-hero text-hero mt-4">
          <span data-hero="line" data-hero-y class="block">ТВОЙ ПРИНТ.</span>
          <span data-hero="line" data-hero-y class="block">ТВОЯ ВЕЩЬ.</span>
        </h1>
        <p data-hero="sub" data-hero-y class="text-lead mt-6 max-w-xl text-ink-cream/85">
          Собери в браузере, увидь цену сразу, получи через пару дней.
          Печатаем от одной штуки — без партий и переплат.
        </p>
        <div data-hero="cta" data-hero-y class="flex flex-wrap gap-3 mt-8">
          <UiAppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
            Создать свой принт
          </UiAppButton>
          <UiAppButton to="/catalog" variant="secondary" size="xl" on-dark>
            Смотреть каталог
          </UiAppButton>
        </div>
        <p data-hero="note" class="ink-label text-ink-cream/55 mt-6">
          Доставка по Казахстану · Оплата онлайн · Тираж от 1
        </p>
      </div>

      <!-- Правая колонка: медиа -->
      <div class="relative">
        <div
          data-hero="media"
          data-hero-media
          class="ink-grain aspect-4/5 rounded-xl overflow-hidden bg-ink-gray-50 shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
        >
          <NuxtImg
            v-if="heroImage"
            :src="heroImage"
            :alt="featured?.title ?? 'Изделие с принтом INKMADE'"
            class="w-full h-full object-cover"
            sizes="(max-width: 1024px) 90vw, 560px"
            loading="eager"
            fetchpriority="high"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
            <UIcon name="i-lucide-shirt" class="size-20" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
