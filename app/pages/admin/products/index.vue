<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { t } = useI18n()
const { listProducts, deleteProduct } = useAdmin()
const { listAll: listCategories } = useCategories()
const toast = useToast()

const { data: products, refresh, pending } = await useAsyncData('admin-products', () => listProducts())
const { data: categories } = await useAsyncData('admin-products-cats', () => listCategories())

const categoryLabel = (v: string) =>
  categories.value?.find(c => c.slug === v)?.title ?? v

async function onDelete(id: string, title: string) {
  if (!confirm(t('admin.products.deleteConfirm', { title }))) return
  try {
    await deleteProduct(id)
    toast.add({ title: t('admin.products.deleted'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: t('admin.products.deleteError'), description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.products.label')" :title="$t('admin.products.title')" :description="$t('admin.products.description')">
      <template #actions>
        <UButton to="/admin/products/new" color="primary" icon="i-lucide-plus">{{ $t('admin.products.newProduct') }}</UButton>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-14" />
    </div>

    <UiEmptyState
      v-else-if="!products?.length"
      icon="i-lucide-package"
      :title="$t('admin.products.emptyTitle')"
      :text="$t('admin.products.emptyText')"
    >
      <UButton to="/admin/products/new" color="primary" icon="i-lucide-plus">{{ $t('admin.products.newProduct') }}</UButton>
    </UiEmptyState>

    <UiPanel v-else :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="px-6 py-3">{{ $t('admin.products.colName') }}</th>
              <th class="px-6 py-3">{{ $t('admin.products.colCategory') }}</th>
              <th class="px-6 py-3">{{ $t('admin.products.colPrice') }}</th>
              <th class="px-6 py-3">{{ $t('admin.products.colStatus') }}</th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id" class="border-b border-ink-gray-200 last:border-0">
              <td class="px-6 py-3">
                <NuxtLink :to="`/admin/products/${p.id}`" class="font-semibold hover:text-ink-burgundy">{{ p.title }}</NuxtLink>
                <span class="ink-label text-ink-gray-400 ml-2">{{ p.alias }}</span>
              </td>
              <td class="px-6 py-3">{{ categoryLabel(p.category) }}</td>
              <td class="px-6 py-3">{{ p.base_price }} {{ $t('units.currency') }}</td>
              <td class="px-6 py-3">
                <UBadge :color="p.is_active ? 'success' : 'neutral'" variant="subtle">
                  {{ p.is_active ? $t('admin.products.statusPublished') : $t('admin.products.statusDraft') }}
                </UBadge>
              </td>
              <td class="px-6 py-3 text-right">
                <UButton :to="`/admin/products/${p.id}`" color="neutral" variant="ghost" size="sm" icon="i-lucide-pencil" />
                <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="onDelete(p.id, p.title)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiPanel>
  </div>
</template>
