<script setup lang="ts">
const { locale } = useI18n()
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-surface text-ink-text" aria-labelledby="edition-heading">
    <div class="mx-auto grid max-w-(--container-max) gap-2 px-4 py-12 lg:grid-cols-12 lg:py-16">
      <NuxtLink to="/catalog" class="group relative min-h-[360px] overflow-hidden rounded-[4px] lg:col-span-8 lg:min-h-[430px]">
        <NuxtImg
          src="/media/ideas/idea-culture-v01.webp"
          alt="Edition 001 — Almaty After Dark"
          format="webp"
          sizes="(max-width: 1023px) 100vw, 900px"
          class="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.025]"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-black/88 via-black/35 to-transparent" />
        <div class="absolute inset-0 flex max-w-xl flex-col justify-between p-6 sm:p-9">
          <div class="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-white/65">
            <span>INK EDITIONS</span><span class="h-px w-10 bg-white/35" /><span>001 / 2026</span>
          </div>
          <div>
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">ALMATY AFTER DARK</p>
            <h2 id="edition-heading" class="ink-display text-h1 text-white">
              {{ locale === 'kk' ? 'Қала қозғалыста. Принт сәтті сақтайды.' : 'Город движется. Принт сохраняет момент.' }}
            </h2>
            <div class="mt-7 inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold text-white">
              {{ locale === 'kk' ? 'Edition-ды ашу' : 'Открыть Edition' }}
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </div>
          </div>
        </div>
      </NuxtLink>

      <div class="grid gap-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
        <NuxtLink to="/catalog" class="group relative min-h-[210px] overflow-hidden rounded-[4px]">
          <NuxtImg src="/media/ideas/idea-abstract-v01.webp" alt="Edition print set" format="webp" sizes="(max-width: 1023px) 50vw, 440px" class="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5 text-white">
            <p class="font-mono text-[10px] tracking-[0.14em] text-white/60">PRINT SET / 04</p>
            <p class="mt-1 font-semibold">{{ locale === 'kk' ? 'Дайын графика' : 'Готовая графика' }}</p>
          </div>
        </NuxtLink>
        <NuxtLink to="/customize/tshirt_oversize" class="group relative min-h-[210px] overflow-hidden rounded-[4px]">
          <NuxtImg src="/media/ideas/idea-art-v01.webp" alt="Customize Edition 001" format="webp" sizes="(max-width: 1023px) 50vw, 440px" class="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5 text-white">
            <p class="font-mono text-[10px] tracking-[0.14em] text-white/60">REMIX / YOURS</p>
            <p class="mt-1 font-semibold">{{ locale === 'kk' ? 'Өзіңе бейімде' : 'Сделай по-своему' }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
