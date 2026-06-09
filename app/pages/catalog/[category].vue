<script setup lang="ts">
// Товары категории (§6.1). SSR для SEO. Категория проверяется по БД.
// Единая карточка CatalogProductCard, скелетоны при загрузке, auto-animate сетки.
const route = useRoute()
const category = route.params.category as string
const { listByCategory } = useCatalog()
const { listActive } = useCategories()

const { data: cat } = await useAsyncData(`cat-${category}`, async () => {
  const cats = await listActive()
  return cats.find(c => c.slug === category) ?? null
})
if (!cat.value) throw createError({ statusCode: 404, statusMessage: 'Категория не найдена' })
const label = cat.value.title
useSeoMeta({
  title: `${label} — INKMADE`,
  description: `${label} с печатью вашего принта по требованию. Кастомизируй в браузере и закажи от одной штуки — INKMADE.`,
  ogTitle: `${label} — INKMADE`,
  ogDescription: `${label}: создай свой принт и закажи от одной штуки.`,
})

const { data: products, pending } = await useAsyncData(
  `catalog-${category}`,
  () => listByCategory(category),
)
const count = computed(() => products.value?.length ?? 0)
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-end justify-between gap-4">
      <div>
        <UiSectionLabel accent>Каталог</UiSectionLabel>
        <h1 class="ink-display text-h1 mt-2">{{ label }}</h1>
        <p v-if="!pending" class="ink-label text-ink-gray-600 mt-2">
          {{ count }} {{ count === 1 ? 'изделие' : 'изделий' }} · печать от одной штуки
        </p>
      </div>
      <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Категории</UButton>
    </div>

    <!-- Скелетоны загрузки -->
    <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="n in 8" :key="n" class="rounded-lg overflow-hidden">
        <UiSkeleton rounded="rounded-lg" class="aspect-4/5" />
        <div class="p-4 space-y-2">
          <UiSkeleton class="h-4 w-3/4" />
          <UiSkeleton class="h-3 w-1/3" />
        </div>
      </div>
    </div>

    <!-- Пустой результат -->
    <UiEmptyState
      v-else-if="!products?.length"
      icon="i-lucide-package-search"
      title="Здесь пока пусто"
      text="В этой категории ещё нет изделий. Загляни в другие — там есть из чего собрать своё."
    >
      <UiAppButton to="/catalog" variant="primary" size="md">В каталог</UiAppButton>
    </UiEmptyState>

    <!-- Сетка товаров -->
    <div v-else v-auto-animate class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(p, i) in products" :key="p.id" :delay="Math.min(i * 50, 400)">
        <CatalogProductCard :product="p" />
      </UiReveal>
    </div>
  </section>
</template>
