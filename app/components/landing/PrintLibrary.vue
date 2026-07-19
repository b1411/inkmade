<script setup lang="ts">
import type { Tables } from '~/types/database.types'

const { locale } = useI18n()
const { listActive } = usePrintLibrary()

const { data } = await useAsyncData('landing-print-library', async () => {
  try { return await listActive() } catch { return [] }
})

const fallback: Array<Pick<Tables<'print_library'>, 'id' | 'title' | 'author' | 'thumbnail_url' | 'file_url'>> = [
  { id: 'steppe-frequency', title: 'Steppe Frequency', author: 'INKMADE Studio', thumbnail_url: '/media/prints/steppe-frequency-v01.webp', file_url: '/media/prints/steppe-frequency-v01.png' },
  { id: 'alatau-night', title: 'Alatau Night', author: 'INKMADE Studio', thumbnail_url: '/media/prints/alatau-night-v01.webp', file_url: '/media/prints/alatau-night-v01.png' },
  { id: 'nomad-grid', title: 'Nomad Grid', author: 'INKMADE Studio', thumbnail_url: '/media/prints/nomad-grid-v01.webp', file_url: '/media/prints/nomad-grid-v01.png' },
  { id: 'orbit-43', title: 'Orbit 43', author: 'INKMADE Studio', thumbnail_url: '/media/prints/orbit-43-v01.webp', file_url: '/media/prints/orbit-43-v01.png' },
  { id: 'concrete-bloom', title: 'Concrete Bloom', author: 'INKMADE Studio', thumbnail_url: '/media/prints/concrete-bloom-v01.webp', file_url: '/media/prints/concrete-bloom-v01.png' },
  { id: 'silk-sun', title: 'Silk Sun', author: 'INKMADE Studio', thumbnail_url: '/media/prints/silk-sun-v01.webp', file_url: '/media/prints/silk-sun-v01.png' },
  { id: 'city-pulse', title: 'City Pulse', author: 'INKMADE Studio', thumbnail_url: '/media/prints/city-pulse-v01.webp', file_url: '/media/prints/city-pulse-v01.png' },
  { id: 'kok-tobe-signal', title: 'Kok-Tobe Signal', author: 'INKMADE Studio', thumbnail_url: '/media/prints/kok-tobe-signal-v01.webp', file_url: '/media/prints/kok-tobe-signal-v01.png' },
]

const prints = computed(() => (data.value?.length ? data.value : fallback).slice(0, 8))
const isLive = (id: string) => /^[0-9a-f-]{32,}$/i.test(id)
const to = (id: string) => isLive(id) ? `/customize/tshirt?print=${encodeURIComponent(id)}` : '/customize/tshirt'
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] overflow-hidden bg-ink-black text-ink-text" aria-labelledby="print-library-heading">
    <div class="mx-auto max-w-(--container-max) px-4 py-14 lg:py-20">
      <div class="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <UiSectionLabel class="text-white/45">03 / CURATED PRINTS</UiSectionLabel>
          <h2 id="print-library-heading" class="ink-display mt-3 max-w-3xl text-h1">
            {{ locale === 'kk' ? 'Дайын графика. Бір шерту.' : 'Готовая графика. Один клик.' }}
          </h2>
          <p class="mt-4 max-w-2xl text-ink-text-soft">
            {{ locale === 'kk' ? 'INKMADE Studio баспаға дайындаған сегіз авторлық жұмыс. Негізді таңдаңыз — принт редакторда бірден ашылады.' : 'Восемь авторских работ INKMADE Studio, подготовленных для печати. Выберите работу — она сразу откроется на вещи в редакторе.' }}
          </p>
        </div>
        <UiAppButton to="/catalog" variant="secondary" on-dark trailing-icon="i-lucide-arrow-right">
          {{ locale === 'kk' ? 'Барлық негіздер' : 'Все основы' }}
        </UiAppButton>
      </div>

      <div class="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-4">
        <NuxtLink
          v-for="(print, index) in prints"
          :key="print.id"
          :to="to(print.id)"
          class="group relative aspect-square overflow-hidden bg-ink-raised focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-burgundy"
        >
          <NuxtImg
            :src="print.thumbnail_url || print.file_url"
            :alt="print.title"
            format="webp"
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            class="size-full object-cover transition duration-700 group-hover:scale-[1.04] group-hover:opacity-75"
            :loading="index < 4 ? 'eager' : 'lazy'"
          />
          <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-4 pt-14">
            <span class="block text-sm font-semibold text-white">{{ print.title }}</span>
            <span class="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[.12em] text-white/55">
              <span>{{ print.author || 'INKMADE Studio' }}</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 translate-y-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100" />
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
