<script setup lang="ts">
const { locale } = useI18n()

const items = computed(() => {
  const ru = ['Типографика', 'Графика', 'Абстракция', 'Минимализм', 'Культура', 'Арт и иллюстрация']
  const kk = ['Типография', 'Графика', 'Абстракция', 'Минимализм', 'Мәдениет', 'Арт және иллюстрация']
  const labels = locale.value === 'kk' ? kk : ru
  const files = ['typography', 'graphic', 'abstract', 'minimal', 'culture', 'art']
  return files.map((file, i) => ({
    file: `/media/ideas/idea-${file}-v01.webp`,
    label: labels[i],
    id: String(i + 1).padStart(2, '0'),
  }))
})
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark" aria-labelledby="ideas-heading">
    <div class="mx-auto max-w-(--container-max) px-4 py-12 lg:py-16">
      <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <UiSectionLabel accent>03 / EDITORIAL</UiSectionLabel>
          <h2 id="ideas-heading" class="ink-display text-h2 mt-2">
            {{ locale === 'kk' ? 'Шабыт ал. Өзіңдікін жаса.' : 'Вдохновляйся. Создавай своё.' }}
          </h2>
        </div>
        <UiAppButton to="/catalog" variant="ghost" size="md" trailing-icon="i-lucide-arrow-right">
          {{ locale === 'kk' ? 'Барлық бағыттар' : 'Все направления' }}
        </UiAppButton>
      </div>

      <div class="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
        <NuxtLink
          v-for="item in items"
          :key="item.file"
          to="/catalog"
          class="group relative min-w-[78vw] snap-start overflow-hidden rounded-[3px] bg-black sm:min-w-[44vw] lg:min-w-0"
        >
          <NuxtImg
            :src="item.file"
            :alt="item.label"
            format="webp"
            sizes="(max-width: 767px) 78vw, (max-width: 1023px) 44vw, 230px"
            class="aspect-[4/3] size-full object-cover transition duration-500 ease-out group-hover:scale-[1.035] group-hover:opacity-90"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
            <span class="font-semibold leading-tight">{{ item.label }}</span>
            <span class="font-mono text-[10px] text-white/60">{{ item.id }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
