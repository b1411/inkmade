<script setup lang="ts">
// Лендинг (§6). Визуальный язык референса, бизнес-логика — B2C self-service.
useHead({ title: 'INKMADE — печать своего принта на одежде' })

const { listAll } = useCatalog()
const { data: examples } = await useAsyncData('landing-examples', () => listAll())

const { listActive } = useCategories()
const { data: categories } = await useAsyncData('landing-categories', () => listActive())

function primaryImage(p: { product_images?: { url: string; is_primary: boolean }[] }) {
  const imgs = p.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}
</script>

<template>
  <div class="space-y-4">
    <LandingHero />

    <!-- лента примеров -->
    <section v-if="examples?.length" class="py-16">
      <UiSectionLabel accent>Примеры</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-6">Что создают на INKMADE</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NuxtLink
          v-for="p in examples.slice(0, 8)"
          :key="p.id"
          :to="`/product/${p.slug}`"
          class="group rounded-lg overflow-hidden border border-ink-gray-200 hover:shadow-md transition-all"
        >
          <div class="aspect-square bg-ink-gray-200 overflow-hidden">
            <img v-if="primaryImage(p)" :src="primaryImage(p)" :alt="p.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
            <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400"><UIcon name="i-lucide-image" class="size-8" /></div>
          </div>
          <p class="p-3 text-caption font-semibold group-hover:text-ink-burgundy">{{ p.title }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- категории плитками -->
    <section v-if="categories?.length" class="py-8">
      <UiSectionLabel accent>Каталог</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-6">Категории</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <NuxtLink
          v-for="c in categories"
          :key="c.id"
          :to="`/catalog/${c.slug}`"
          class="group border border-ink-gray-200 rounded-lg p-6 flex flex-col items-center gap-3 hover:border-ink-burgundy hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-burgundy"
        >
          <UIcon :name="c.icon ?? 'i-lucide-package'" class="size-9 text-ink-burgundy" />
          <span class="font-semibold text-center">{{ c.title }}</span>
        </NuxtLink>
      </div>
    </section>

    <LandingMethods />
    <LandingHowItWorks />
    <LandingFaq />
  </div>
</template>
