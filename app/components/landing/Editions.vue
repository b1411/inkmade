<script setup lang="ts">
const { locale } = useI18n()
const copy = computed(() => locale.value === 'kk'
  ? { title: 'Қаланың ырғағын ки.', cta: 'Коллекцияны ашу', ready: 'Дайын графика', remix: 'Өзіңше жаса' }
  : { title: 'Носи ритм своего города.', cta: 'Открыть коллекцию', ready: 'Готовая графика', remix: 'Сделать по-своему' })
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-surface text-ink-text" aria-labelledby="edition-heading">
    <div class="mx-auto grid max-w-(--container-max) gap-2 px-4 py-12 lg:grid-cols-12 lg:py-16">
      <NuxtLink to="/catalog" class="group relative min-h-[360px] overflow-hidden rounded-[4px] bg-[#0d1012] lg:col-span-8 lg:min-h-[430px]">
        <NuxtImg src="/media/campaigns/audience-events-v03.webp" alt="Команда INKMADE в вечернем Алматы" format="webp" sizes="(max-width: 1023px) 100vw, 900px" class="absolute inset-0 size-full object-cover object-center transition duration-700 group-hover:scale-[1.02]" />
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/10" />
        <div class="absolute inset-0 flex max-w-xl flex-col justify-between p-6 sm:p-9">
          <div class="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-white/65">
            <span>04 / INK EDITIONS</span><span class="h-px w-10 bg-white/35" /><span>001 / 2026</span>
          </div>
          <div>
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">ALMATY AFTER DARK</p>
            <h2 id="edition-heading" class="ink-display text-h1 text-white">
              {{ copy.title }}
            </h2>
            <div class="mt-7 inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold text-white">
              {{ copy.cta }}
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </div>
          </div>
        </div>
      </NuxtLink>

      <div class="grid gap-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
        <NuxtLink to="/catalog" class="group relative min-h-[210px] overflow-hidden rounded-[4px] bg-[#111214]">
          <NuxtImg src="/media/campaigns/audience-creators-v03.webp" alt="Креаторы INKMADE в Алматы" format="webp" sizes="(max-width: 1023px) 50vw, 440px" class="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5 text-white">
            <p class="font-mono text-[10px] tracking-[0.14em] text-white/60">PRINT SET / 04</p>
            <p class="mt-1 font-semibold">{{ copy.ready }}</p>
          </div>
        </NuxtLink>
        <NuxtLink to="/customize/tshirt_oversize" class="group relative min-h-[210px] overflow-hidden rounded-[4px] bg-[#111214]">
          <NuxtImg src="/media/campaigns/audience-sport-v03.webp" alt="Спортивная команда INKMADE в Алматы" format="webp" sizes="(max-width: 1023px) 50vw, 440px" class="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5 text-white">
            <p class="font-mono text-[10px] tracking-[0.14em] text-white/60">REMIX / YOURS</p>
            <p class="mt-1 font-semibold">{{ copy.remix }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
