<script setup lang="ts">
// Избранное (CRM §3.1): товары и принты.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { listProducts, listPrints, remove } = useFavorites()
const toast = useToast()
const { t } = useI18n()

const { data: products, refresh: refreshP, pending: pP } = await useAsyncData('fav-products', () => listProducts())
const { data: prints, refresh: refreshPr, pending: pPr } = await useAsyncData('fav-prints', () => listPrints())

function primary(p: { products?: { product_images?: { url: string; is_primary: boolean }[] } | null }) {
  const imgs = p.products?.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}
const removingId = ref<string | null>(null)
async function rm(id: string) {
  if (removingId.value) return
  removingId.value = id
  try {
    await remove(id)
    await Promise.all([refreshP(), refreshPr()])
  } catch (e) {
    toast.add({ title: t('account.favorites.removeError'), description: getFetchMessage(e), color: 'error' })
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('account.favorites.label')" :title="$t('account.favorites.title')" :description="$t('account.favorites.description')" />

    <section class="mb-10">
      <UiSectionLabel>{{ $t('account.favorites.products') }}</UiSectionLabel>
      <div v-if="pP" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
        <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="aspect-square" />
      </div>
      <div v-else-if="!products?.length" class="py-4 text-ink-gray-600 text-caption">
        {{ $t('account.favorites.emptyProducts') }} <NuxtLink to="/catalog" class="text-ink-burgundy font-semibold">{{ $t('account.favorites.toCatalog') }}</NuxtLink>
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
        <div v-for="f in products" :key="f.id" class="border border-ink-gray-200 rounded-lg overflow-hidden group">
          <NuxtLink :to="`/product/${f.products?.slug}`" class="block aspect-square bg-ink-gray-200">
            <img v-if="primary(f)" :src="primary(f)" :alt="f.products?.title ?? ''" class="w-full h-full object-cover">
          </NuxtLink>
          <div class="p-2 flex items-center justify-between gap-1">
            <span class="text-caption font-semibold truncate">{{ f.products?.title }}</span>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-heart-off" :loading="removingId === f.id" :aria-label="t('account.favorites.removeAria')" @click="rm(f.id)" />
          </div>
        </div>
      </div>
    </section>

    <section>
      <UiSectionLabel>{{ $t('account.favorites.prints') }}</UiSectionLabel>
      <div v-if="pPr" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-3">
        <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="aspect-square" />
      </div>
      <div v-else-if="!prints?.length" class="py-4 text-ink-gray-600 text-caption">{{ $t('account.favorites.emptyPrints') }}</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-3">
        <div v-for="f in prints" :key="f.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
          <div class="aspect-square bg-ink-gray-200">
            <img v-if="f.print_library?.thumbnail_url" :src="f.print_library.thumbnail_url" :alt="f.print_library?.title ?? ''" class="w-full h-full object-contain">
          </div>
          <div class="p-2 flex items-center justify-between gap-1">
            <span class="text-caption font-semibold truncate">{{ f.print_library?.title }}</span>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-heart-off" :loading="removingId === f.id" :aria-label="t('account.favorites.removeAria')" @click="rm(f.id)" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
