<script setup lang="ts">
import { PRODUCT_CATEGORIES } from '~/types/models'

// Товары категории (§6). SSR для SEO.
const route = useRoute()
const category = route.params.category as string
const { listByCategory } = useCatalog()

const known = PRODUCT_CATEGORIES.find(c => c.value === category)
if (!known) throw createError({ statusCode: 404, statusMessage: 'Категория не найдена' })
const label = known.label
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

function primaryImage(p: { product_images?: { url: string; is_primary: boolean }[] }) {
  const imgs = p.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <UiSectionLabel accent>{{ label }}</UiSectionLabel>
        <h1 class="ink-display text-h2 mt-2">{{ label }}</h1>
      </div>
      <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Категории</UButton>
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
    <div v-else-if="!products?.length" class="py-10 text-center text-ink-gray-600">
      В этой категории пока нет товаров.
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <NuxtLink
        v-for="p in products"
        :key="p.id"
        :to="`/product/${p.slug}`"
        class="group rounded-lg overflow-hidden border border-ink-gray-200 hover:shadow-md transition-all"
      >
        <div class="aspect-square bg-ink-gray-200 overflow-hidden">
          <img
            v-if="primaryImage(p)"
            :src="primaryImage(p)"
            :alt="p.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform"
          >
          <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
            <UIcon name="i-lucide-image" class="size-10" />
          </div>
        </div>
        <div class="p-4">
          <p class="font-semibold group-hover:text-ink-burgundy">{{ p.title }}</p>
          <p class="text-ink-gray-600 mt-1">от {{ p.base_price }} ₸</p>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
