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
      <h1 class="ink-display text-h2 mt-2">Выбери изделие</h1>
    </div>

    <div v-if="!categories?.length" class="py-10 text-center text-ink-gray-600">
      Категории появятся совсем скоро.
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <NuxtLink
        v-for="c in categories"
        :key="c.id"
        :to="`/catalog/${c.slug}`"
        class="group border border-ink-gray-200 rounded-lg p-6 flex flex-col items-center gap-3 hover:border-ink-burgundy hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-burgundy"
      >
        <UIcon :name="c.icon ?? 'i-lucide-package'" class="size-10 text-ink-burgundy" />
        <span class="font-semibold text-center">{{ c.title }}</span>
      </NuxtLink>
    </div>
  </section>
</template>
