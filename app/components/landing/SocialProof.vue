<script setup lang="ts">
const { locale } = useI18n()

const products = [
  { slug: 'tshirt', file: 'classic', label: 'Classic', meta: 'Regular / 220 GSM' },
  { slug: 'tshirt_oversize', file: 'oversize', label: 'Oversize', meta: 'Loose / 240 GSM' },
  { slug: 'polo', file: 'polo', label: 'Polo', meta: 'Relaxed / 220 GSM' },
  { slug: 'sweatshirt', file: 'sweatshirt', label: 'Sweatshirt', meta: 'Relaxed / 320 GSM' },
  { slug: 'hoodie', file: 'hoodie', label: 'Hoodie', meta: 'Oversize / 340 GSM' },
  { slug: 'cap', file: 'cap', label: 'Cap', meta: '6 panel / Twill' },
  { slug: 'tote', file: 'tote', label: 'Canvas Tote', meta: 'Canvas / 320 GSM' },
] as const

const copy = computed(() => locale.value === 'kk'
  ? {
      label: '07 / FIT STUDY',
      title: 'Пішім мен көлем анық көрінеді.',
      body: 'Әр негізді бірдей жарықта және бейтарап фонда көрсетеміз. Кездейсоқ принттер жоқ — тек нақты пішім, көлем және материал.',
      view: 'Негізді ашу',
    }
  : {
      label: '07 / FIT STUDY',
      title: 'Посадка и объём — без догадок.',
      body: 'Каждую основу показываем в одном свете и на нейтральном фоне. Никаких случайных принтов — только честная форма, объём и материал.',
      view: 'Открыть основу',
    })
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] overflow-hidden bg-ink-black py-14 text-white lg:py-20" aria-labelledby="base-system-title">
    <div class="mx-auto max-w-(--container-max) px-4">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-7">
          <UiSectionLabel class="text-white/45">{{ copy.label }}</UiSectionLabel>
          <h2 id="base-system-title" class="ink-display mt-3 text-h1">{{ copy.title }}</h2>
        </div>
        <p class="max-w-lg text-ink-text-soft lg:col-span-4 lg:col-start-9">{{ copy.body }}</p>
      </div>

      <div class="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        <NuxtLink
          v-for="(product, index) in products"
          :key="product.slug"
          :to="`/product/${product.slug}`"
          class="group min-w-[68vw] snap-start overflow-hidden border border-white/10 bg-ink-card text-ink-text-dark sm:min-w-[36vw] lg:min-w-0"
          :aria-label="`${copy.view}: ${product.label}`"
        >
          <div class="relative aspect-[.8] overflow-hidden bg-[#d9d5ce]">
            <NuxtImg
              :src="`/media/models/fit-${product.file}-v02.webp`"
              :alt="`${product.label}, посадка на модели`"
              class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
              sizes="(max-width: 1023px) 68vw, 300px"
              loading="lazy"
            />
            <span class="absolute left-3 top-3 border border-black/12 bg-white/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-black/55 backdrop-blur">0{{ index + 1 }}</span>
          </div>
          <div class="flex items-end justify-between gap-3 border-t border-black/8 p-4">
            <div>
              <p class="font-display text-xl font-black uppercase">{{ product.label }}</p>
              <span class="font-mono text-[9px] uppercase tracking-[.14em] text-black/45">{{ product.meta }}</span>
            </div>
            <UIcon name="i-lucide-arrow-up-right" class="size-5 text-ink-burgundy transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
