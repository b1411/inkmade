<script setup lang="ts">
import { PRODUCT_CATEGORIES } from '~/types/models'

// Каталог категорий плитками (§6). Публичная страница, SSR.
useHead({ title: 'Каталог — INKMADE' })

const categoryIcons: Record<string, string> = {
  trikotazh: 'i-lucide-shirt',
  sport: 'i-lucide-activity',
  verhnyaya: 'i-lucide-layers',
  golovnye: 'i-lucide-hard-hat',
  sumki: 'i-lucide-shopping-bag',
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <UiSectionLabel accent>Каталог</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-2">Выбери изделие</h1>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <NuxtLink
        v-for="c in PRODUCT_CATEGORIES"
        :key="c.value"
        :to="`/catalog/${c.value}`"
        class="group border border-ink-gray-200 rounded-lg p-6 flex flex-col items-center gap-3 hover:border-ink-burgundy hover:shadow-md transition-all"
      >
        <UIcon :name="categoryIcons[c.value] ?? 'i-lucide-package'" class="size-10 text-ink-burgundy" />
        <span class="font-semibold text-center">{{ c.label }}</span>
      </NuxtLink>
    </div>
  </section>
</template>
