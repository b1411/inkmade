<script setup lang="ts">
// «Как это работает» (§5.6): 4 шага как editorial-таймлайн. Соединительная линия
// проходит СКВОЗЬ узлы-иконки и «прорисовывается» по ScrollTrigger (§8). На десктопе —
// горизонтальный путь, на мобайле — вертикальный. Якорь #how.
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
    <h2 id="how-heading" :key="locale" v-reveal-text class="ink-display text-h2 mt-2 mb-12">{{ $t('landing.howItWorks.title') }}</h2>

    <!-- ── Десктоп: горизонтальный таймлайн, линия идёт сквозь центры узлов ── -->
    <div class="hidden lg:block relative">
      <!-- трек проходит ровно по центрам 4 узлов (центры колонок: 1/8 … 7/8) -->
      <div class="absolute left-[12.5%] right-[12.5%] top-8 h-px bg-ink-gray-200">
        <div ref="line" class="absolute inset-0 origin-left bg-ink-burgundy" />
      </div>

      <div class="grid grid-cols-4 gap-8">
        <UiReveal v-for="(s, i) in steps" :key="s.n" :delay="i * 90">
          <div class="group flex flex-col items-center text-center">
            <div class="relative z-10">
              <div class="flex size-16 items-center justify-center rounded-full border border-ink-cream-dark bg-ink-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-ink-burgundy group-hover:bg-ink-burgundy group-hover:shadow-md">
                <UIcon :name="s.icon" class="size-7 text-ink-burgundy transition-colors duration-300 group-hover:text-ink-cream" />
              </div>
              <span class="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink-burgundy font-mono text-[11px] font-bold text-ink-cream ring-2 ring-ink-white">
                {{ s.n }}
              </span>
            </div>
            <h3 class="font-bold text-h3 mt-6">{{ s.title }}</h3>
            <p class="text-ink-gray-600 mt-2 max-w-[24ch]">{{ s.text }}</p>
          </div>
        </UiReveal>
      </div>
    </div>

    <!-- ── Мобайл/планшет: вертикальный таймлайн ── -->
    <div class="lg:hidden">
      <UiReveal v-for="(s, i) in steps" :key="s.n" :delay="i * 80">
        <div class="group relative flex gap-5 pb-8 last:pb-0">
          <!-- узел + вертикальный коннектор к следующему шагу -->
          <div class="relative flex flex-col items-center">
            <div class="relative z-10">
              <div class="flex size-14 items-center justify-center rounded-full border border-ink-cream-dark bg-ink-white shadow-sm transition-colors duration-300 group-hover:border-ink-burgundy group-hover:bg-ink-burgundy">
                <UIcon :name="s.icon" class="size-6 text-ink-burgundy transition-colors duration-300 group-hover:text-ink-cream" />
              </div>
              <span class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink-burgundy font-mono text-[10px] font-bold text-ink-cream ring-2 ring-ink-white">
                {{ s.n }}
              </span>
            </div>
            <div v-if="i < steps.length - 1" class="mt-2 w-px flex-1 bg-ink-gray-200" />
          </div>
          <div class="pt-2 pb-1">
            <h3 class="font-bold text-h3">{{ s.title }}</h3>
            <p class="text-ink-gray-600 mt-1.5">{{ s.text }}</p>
          </div>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
