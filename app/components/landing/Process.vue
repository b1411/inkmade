<script setup lang="ts">
const { locale } = useI18n()
const copy = computed(() => locale.value === 'kk'
  ? {
      label: '06 / MADE IN ALMATY',
      title: 'Материалдан — дайын затқа.',
      body: 'Тығыз негіз, анық принт және күнделікті киюге арналған пішім. Нәтижені материал мен дайын бұйым арқылы көрсетеміз.',
      print: 'Материал',
      printText: 'Тығыз мақта, ұқыпты тігістер және пішінін сақтайтын негіз.',
      pack: 'Дайын зат',
      packText: 'Принт пен негіз біртұтас көрінеді — артық өндірістік декорациясыз.',
    }
  : {
      label: '06 / MADE IN ALMATY',
      title: 'От материала — к готовой вещи.',
      body: 'Плотная основа, чёткий принт и посадка для повседневной носки. Показываем результат через материал и готовое изделие.',
      print: 'Материал',
      printText: 'Плотный хлопок, аккуратные швы и основа, которая держит форму.',
      pack: 'Готовая вещь',
      packText: 'Принт и основа смотрятся единым целым — без постановочных производственных сцен.',
    })
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark" aria-labelledby="process-title">
    <div class="mx-auto max-w-(--container-max) px-4 py-14 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-5">
          <UiSectionLabel accent>{{ copy.label }}</UiSectionLabel>
          <h2 id="process-title" class="ink-display mt-3 text-h1">{{ copy.title }}</h2>
        </div>
        <p class="max-w-xl text-base leading-relaxed text-ink-text-dark-soft lg:col-span-5 lg:col-start-8">{{ copy.body }}</p>
      </div>

      <div class="mt-8 grid gap-3 lg:grid-cols-2">
        <article class="group relative min-h-[420px] overflow-hidden bg-ink-black lg:min-h-[560px]">
          <NuxtImg src="/media/products/detail/cotton-collar-v01.webp" :alt="copy.print" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" sizes="(max-width: 1023px) 100vw, 720px" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <span class="font-mono text-[10px] uppercase tracking-[.14em] text-white/50">01 / MATERIAL</span>
            <h3 class="ink-display mt-2 text-4xl sm:text-5xl">{{ copy.print }}</h3>
            <p class="mt-3 max-w-md text-sm text-white/70">{{ copy.printText }}</p>
          </div>
        </article>
        <article class="group relative min-h-[420px] overflow-hidden bg-ink-black lg:min-h-[560px]">
          <NuxtImg src="/media/products/blank/hoodie-v01.webp" :alt="copy.pack" class="absolute inset-0 size-full bg-[#d9d5ce] object-contain p-8 transition-transform duration-700 group-hover:scale-[1.025] sm:p-12" sizes="(max-width: 1023px) 100vw, 720px" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <span class="font-mono text-[10px] uppercase tracking-[.14em] text-white/50">02 / RESULT</span>
            <h3 class="ink-display mt-2 text-4xl sm:text-5xl">{{ copy.pack }}</h3>
            <p class="mt-3 max-w-md text-sm text-white/70">{{ copy.packText }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
