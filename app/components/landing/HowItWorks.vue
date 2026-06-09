<script setup lang="ts">
// «Как это работает» (§5.6): 4 шага. Соединительная линия «прорисовывается» по
// ScrollTrigger (§8). Крупные display-номера, каскадное появление, якорь #how.
const steps = [
  { n: 1, icon: 'i-lucide-shirt', title: 'Выбери изделие', text: 'Футболка, худи, свитшот, кепка. Выбери цвет и размер.' },
  { n: 2, icon: 'i-lucide-image-plus', title: 'Добавь принт', text: 'Загрузи свой файл, выбери из каталога или набери текст.' },
  { n: 3, icon: 'i-lucide-move', title: 'Размести и оцени', text: 'Двигай, масштабируй, крути. Цена считается на лету.' },
  { n: 4, icon: 'i-lucide-package-check', title: 'Оплати и получи', text: 'Онлайн-оплата, печать, доставка по Казахстану.' },
]

const root = ref<HTMLElement | null>(null)
const line = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
let ctx: { revert: () => void } | null = null

onMounted(() => {
  if (prefersReduced.value) return
  const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
  const el = root.value
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
    <UiSectionLabel accent>Просто</UiSectionLabel>
    <h2 id="how-heading" class="ink-display text-h2 mt-2 mb-10">От идеи до вещи — 4 шага</h2>

    <!-- Соединительная линия (десктоп) -->
    <div class="hidden lg:block relative h-0.5 mb-8 bg-ink-gray-200 rounded-full overflow-hidden">
      <div ref="line" class="absolute inset-0 origin-left bg-ink-burgundy" />
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(s, i) in steps" :key="s.n" :delay="i * 80">
        <div class="relative h-full rounded-lg border border-ink-gray-200 p-6 bg-ink-white">
          <span class="ink-display text-6xl text-ink-cream-dark absolute top-2 right-4 select-none leading-none">
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
