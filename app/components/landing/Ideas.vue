<script setup lang="ts">
const { locale } = useI18n()

const items = computed(() => {
  const ru = ['Кампус', 'Команда', 'Креаторы', 'Спорт', 'Ивенты', 'Сообщество']
  const kk = ['Кампус', 'Команда', 'Креаторлар', 'Спорт', 'Ивенттер', 'Қауымдастық']
  const labels = locale.value === 'kk' ? kk : ru
  const files = ['campus', 'startup', 'creators', 'sport', 'events', 'community']
  return files.map((file, i) => ({
    file: `/media/campaigns/audience-${file}-v03.webp`,
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
          <UiSectionLabel accent>03 / INKMADE COMMUNITY</UiSectionLabel>
          <h2 id="ideas-heading" class="ink-display mt-2 text-h2">
            {{ locale === 'kk' ? 'Өз адамдарыңа арналған мерч. Өз қалаңда.' : 'Мерч для своих. В городе, который нас объединяет.' }}
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
          class="group min-w-[78vw] snap-start overflow-hidden rounded-[3px] border border-black/10 bg-ink-black sm:min-w-[44vw] lg:min-w-0"
        >
          <div class="relative aspect-[4/5] overflow-hidden bg-[#111214]">
            <NuxtImg :src="item.file" :alt="`Команда INKMADE в Алматы: ${item.label}`" format="webp" sizes="(max-width: 767px) 78vw, (max-width: 1023px) 44vw, 230px" class="size-full object-cover object-center transition duration-500 ease-out group-hover:scale-[1.025]" loading="lazy" />
          </div>
          <div class="flex items-end justify-between gap-2 border-t border-white/10 p-3 text-white">
            <span class="font-semibold leading-tight">{{ item.label }}</span>
            <span class="font-mono text-[10px] text-white/45">{{ item.id }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
