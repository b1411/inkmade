<script setup lang="ts">
// Каталог категорий плитками (§6). Публичная страница, SSR. Категории — из БД.
useHead({ title: 'Каталог — INKMADE' })

const { listActive } = useCategories()
const { data: categories } = await useAsyncData('catalog-categories', () => listActive())
</script>

<template>
  <section class="space-y-8">
    <div>
      <UiSectionLabel accent>Каталог</UiSectionLabel>
      <h1 class="ink-display text-h1 mt-2">Выбери основу</h1>
      <p class="text-lead text-ink-gray-600 mt-3">Начни с изделия — принт добавишь в конструкторе.</p>
    </div>

    <UiEmptyState
      v-if="!categories?.length"
      icon="i-lucide-layout-grid"
      title="Категории на подходе"
      text="Совсем скоро здесь появятся изделия для кастомизации."
    />

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <UiReveal v-for="(c, i) in categories" :key="c.id" :delay="i * 60">
        <UiAppCard :to="`/catalog/${c.slug}`" hover class="h-full">
          <div class="p-6 flex flex-col items-center gap-3 text-center">
            <UIcon :name="c.icon ?? 'i-lucide-package'" class="size-10 text-ink-burgundy" />
            <span class="font-semibold">{{ c.title }}</span>
          </div>
        </UiAppCard>
      </UiReveal>
    </div>
  </section>
</template>
