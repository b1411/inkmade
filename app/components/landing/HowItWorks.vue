<script setup lang="ts">
// «Как это работает» (§5.6): 4 шага. Соединительная линия «прорисовывается» по
// ScrollTrigger (§8). Крупные display-номера, каскадное появление, якорь #how.
const { t, locale } = useI18n()
const icons = ['i-lucide-shirt', 'i-lucide-image-plus', 'i-lucide-move', 'i-lucide-package-check']
const steps = computed(() =>
  icons.map((icon, i) => ({
    n: i + 1,
    icon,
    title: t(`landing.howItWorks.steps[${i}].title`),
    text: t(`landing.howItWorks.steps[${i}].text`),
  })),
)

const root = ref<HTMLElement | null>(null)
const line = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
let ctx: { revert: () => void } | null = null

onMounted(() => {
  if (prefersReduced.value) return
  const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
  // template-ref выводится vue-tsc структурно (конфликт CSSOM) — приводим к HTMLElement.
  const el = root.value as HTMLElement | null
  const ln = line.value
  if (!gsap || !el || !ln) return

  ctx = gsap.context(() => {
    // По умолчанию линия полная (reduced/без-JS); JS сворачивает и рисует по скроллу.
    gsap.set(ln, { scaleX: 0 })
    gsap.to(ln, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 75%', scrub: true },
    })
  }, el)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section id="how" ref="root" aria-labelledby="how-heading" style="scroll-margin-top: 96px">
    <UiSectionLabel accent>{{ $t('landing.howItWorks.label') }}</UiSectionLabel>
    <h2 id="how-heading" :key="locale" v-reveal-text class="ink-display text-h2 mt-2 mb-10">{{ $t('landing.howItWorks.title') }}</h2>

    <!-- Соединительная линия (десктоп) -->
    <div class="hidden lg:block relative h-0.5 mb-8 bg-ink-gray-200 rounded-full overflow-hidden">
      <div ref="line" class="absolute inset-0 origin-left bg-ink-burgundy" />
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(s, i) in steps" :key="s.n" :delay="i * 80">
        <div class="group relative h-full overflow-hidden rounded-xl border border-ink-gray-200/70 p-6 bg-ink-white transition-all duration-300 hover:-translate-y-1 hover:border-ink-burgundy/30 hover:shadow-lg">
          <span class="ink-display text-7xl text-ink-cream-dark/70 absolute -top-1 right-3 select-none leading-none transition-colors duration-300 group-hover:text-ink-burgundy/15">
            {{ s.n }}
          </span>
          <UIcon :name="s.icon" class="size-8 text-ink-burgundy relative" />
          <h3 class="font-bold text-h3 mt-4 relative">{{ s.title }}</h3>
          <p class="text-ink-gray-600 mt-2 relative">{{ s.text }}</p>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
