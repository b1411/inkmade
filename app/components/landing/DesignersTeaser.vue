<script setup lang="ts">
// Блок дизайнеров (§5.8) — тизер опоры №2. Тёмная акцентная секция, призыв
// для творцов. Справа — parallax-стопка принтов дизайнеров (idle-float + reveal).
import { ref, onMounted } from 'vue'

const root = ref<HTMLElement | null>(null)
const fx = useScrollFx()

onMounted(() => {
  // vue-tsc выводит тип template-ref структурно (конфликт CSSOM с lib.dom) —
  // приводим к именованному HTMLElement на границе, чтобы gsap/scope приняли цель.
  const el = root.value as HTMLElement | null
  if (!el) return
  fx.scope(el, (_gsap, _reveal, parallax, float) => {
    float('[data-d-float]', { y: 10 })
    if (window.matchMedia('(pointer: fine)').matches) {
      parallax('[data-d-stack]', el, { y: -8 })
    }
  })
})
</script>

<template>
  <section ref="root" class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden">
    <div class="absolute -bottom-24 -right-16 size-80 rounded-full bg-ink-black/30 blur-3xl" />
    <div
      class="relative mx-auto max-w-(--container-max) px-4 grid lg:grid-cols-2 gap-8 items-center"
      style="padding-block: var(--section-pad)"
    >
      <UiReveal>
        <UiSectionLabel class="text-ink-cream/60">{{ $t('landing.designers.label') }}</UiSectionLabel>
        <h2 class="ink-display text-h1 mt-3">{{ $t('landing.designers.titleLine1') }}<br>{{ $t('landing.designers.titleLine2') }}</h2>
        <p class="text-lead mt-5 max-w-xl text-ink-cream/85">
          {{ $t('landing.designers.text') }}
        </p>
        <div class="mt-8">
          <UiAppButton to="/login" variant="primary" size="lg" on-dark magnetic>
            {{ $t('landing.designers.cta') }}
          </UiAppButton>
        </div>
      </UiReveal>

      <!-- Parallax-стопка принтов дизайнеров (декор) -->
      <div class="hidden lg:block relative h-80" data-d-stack aria-hidden="true">
        <UiMediaSlot
          name="designers.print-3"
          data-d-float
          rounded="rounded-xl"
          class="absolute right-24 top-4 w-44 -rotate-8 ring-1 ring-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.45)]"
        />
        <UiMediaSlot
          name="designers.print-1"
          data-d-float
          rounded="rounded-xl"
          class="absolute right-44 top-24 w-40 -rotate-2 ring-1 ring-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.45)]"
        />
        <UiMediaSlot
          name="designers.print-2"
          data-d-float
          rounded="rounded-xl"
          class="absolute right-6 top-20 w-44 rotate-6 ring-1 ring-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.45)]"
        />
      </div>
    </div>
  </section>
</template>
