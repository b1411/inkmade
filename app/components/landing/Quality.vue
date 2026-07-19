<script setup lang="ts">
const { locale } = useI18n()
const items = computed(() => {
  const ru = ['Плотный хлопок 240 г/м²', 'Ровное нанесение', 'Усиленные швы', 'Горловина держит форму']
  const kk = ['Тығыз мақта 240 г/м²', 'Таза басылым', 'Күшейтілген тігістер', 'Пішінін сақтайтын жаға']
  const labels = locale.value === 'kk' ? kk : ru
  const files = ['cotton', 'print', 'seams', 'collar']
  return files.map((file, i) => ({ file: `/media/quality/quality-${file}-v01.webp`, label: labels[i] }))
})
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-text" aria-labelledby="quality-heading">
    <div class="mx-auto max-w-(--container-max) px-4 py-12 lg:py-16">
      <div class="grid gap-2 lg:grid-cols-6">
        <div class="flex flex-col justify-between border border-white/10 bg-ink-surface p-6 sm:p-8 lg:col-span-2">
          <div>
            <UiSectionLabel class="text-white/50">{{ locale === 'kk' ? '06 / САПА' : '06 / КАЧЕСТВО' }}</UiSectionLabel>
            <h2 id="quality-heading" class="ink-display text-h2 mt-3">
              {{ locale === 'kk' ? 'Жақсы зат негізден басталады.' : 'Хорошая вещь начинается с основы.' }}
            </h2>
            <p class="mt-4 max-w-md text-ink-text-soft">
              {{ locale === 'kk' ? 'Матаның тығыздығын, тігістерін және пішімін тексереміз. Баспа алдында макетті, ал жөнелтер алдында дайын затты қараймыз.' : 'Проверяем плотность ткани, швы и посадку. Перед печатью смотрим макет, перед отправкой — готовую вещь.' }}
            </p>
          </div>
          <NuxtLink to="/catalog" class="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-bone">
            {{ locale === 'kk' ? 'Негізді таңдау' : 'Выбрать основу' }}
            <UIcon name="i-lucide-arrow-right" class="size-4 text-ink-burgundy-hover" />
          </NuxtLink>
        </div>

        <div v-for="item in items" :key="item.file" class="group relative min-h-[210px] overflow-hidden lg:min-h-[300px]">
          <NuxtImg :src="item.file" :alt="item.label" format="webp" sizes="(max-width: 767px) 50vw, 240px" class="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <p class="absolute inset-x-0 bottom-0 p-4 text-xs font-semibold uppercase tracking-[0.08em] text-white">{{ item.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
