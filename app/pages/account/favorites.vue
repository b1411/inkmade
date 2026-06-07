<script setup lang="ts">
// Избранное (CRM §3.1): товары и принты.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { listProducts, listPrints, remove } = useFavorites()

const { data: products, refresh: refreshP, pending: pP } = await useAsyncData('fav-products', () => listProducts())
const { data: prints, refresh: refreshPr, pending: pPr } = await useAsyncData('fav-prints', () => listPrints())

function primary(p: { products?: { product_images?: { url: string; is_primary: boolean }[] } | null }) {
  const imgs = p.products?.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}
async function rm(id: string) { await remove(id); await Promise.all([refreshP(), refreshPr()]) }
</script>

<template>
  <div>
    <UiSectionLabel accent>Избранное</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Сохранённое</h1>

    <section class="mb-10">
      <UiSectionLabel>Товары</UiSectionLabel>
      <div v-if="pP" class="py-6 text-ink-gray-600">Загрузка…</div>
      <div v-else-if="!products?.length" class="py-4 text-ink-gray-600 text-caption">
        Нет избранных товаров. <NuxtLink to="/catalog" class="text-ink-burgundy font-semibold">В каталог</NuxtLink>
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
        <div v-for="f in products" :key="f.id" class="border border-ink-gray-200 rounded-lg overflow-hidden group">
          <NuxtLink :to="`/product/${f.products?.slug}`" class="block aspect-square bg-ink-gray-200">
            <img v-if="primary(f)" :src="primary(f)" :alt="f.products?.title ?? ''" class="w-full h-full object-cover">
          </NuxtLink>
          <div class="p-2 flex items-center justify-between gap-1">
            <span class="text-caption font-semibold truncate">{{ f.products?.title }}</span>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-heart-off" @click="rm(f.id)" />
          </div>
        </div>
      </div>
    </section>

    <section>
      <UiSectionLabel>Принты</UiSectionLabel>
      <div v-if="pPr" class="py-6 text-ink-gray-600">Загрузка…</div>
      <div v-else-if="!prints?.length" class="py-4 text-ink-gray-600 text-caption">Нет избранных принтов.</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-3">
        <div v-for="f in prints" :key="f.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
          <div class="aspect-square bg-ink-gray-200">
            <img v-if="f.print_library?.thumbnail_url" :src="f.print_library.thumbnail_url" :alt="f.print_library?.title ?? ''" class="w-full h-full object-contain">
          </div>
          <div class="p-2 flex items-center justify-between gap-1">
            <span class="text-caption font-semibold truncate">{{ f.print_library?.title }}</span>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-heart-off" @click="rm(f.id)" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
