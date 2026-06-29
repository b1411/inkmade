<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { t } = useI18n()
const { listProducts, deleteProduct, setPublishedBulk, deleteProductsBulk } = useAdmin()
const { listAll: listCategories } = useCategories()
const toast = useToast()

const { data: products, refresh, pending } = await useAsyncData('admin-products', () => listProducts())
const { data: categories } = await useAsyncData('admin-products-cats', () => listCategories())

const categoryLabel = (v: string) =>
  categories.value?.find(c => c.slug === v)?.title ?? v

// ── Мультивыбор для массовых операций ────────────────────────────
const selected = ref<Set<string>>(new Set())
const allIds = computed(() => products.value?.map(p => p.id) ?? [])
const allSelected = computed(() => allIds.value.length > 0 && selected.value.size === allIds.value.length)
const someSelected = computed(() => selected.value.size > 0 && !allSelected.value)
const busy = ref(false)

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(allIds.value)
}
function clearSelection() {
  selected.value = new Set()
}

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

async function bulkPublish(isActive: boolean) {
  const ids = [...selected.value]
  if (!ids.length) return
  busy.value = true
  try {
    await setPublishedBulk(ids, isActive)
    toast.add({ title: isActive ? t('admin.products.bulkPublished') : t('admin.products.bulkUnpublished'), color: 'success' })
    clearSelection()
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.products.bulkError'), description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = false
  }
}

async function bulkDelete() {
  const ids = [...selected.value]
  if (!ids.length) return
  if (!confirm(t('admin.products.bulkDeleteConfirm', { count: ids.length }))) return
  busy.value = true
  try {
    await deleteProductsBulk(ids)
    toast.add({ title: t('admin.products.bulkDeleted', { count: ids.length }), color: 'success' })
    clearSelection()
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.products.bulkError'), description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = false
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

    <template v-else>
      <!-- Панель массовых действий -->
      <div
        v-if="selected.size"
        class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-burgundy/30 bg-ink-burgundy/5 px-4 py-3"
      >
        <span class="font-semibold text-ink-burgundy">{{ $t('admin.products.selected', { count: selected.size }) }}</span>
        <div class="flex-1" />
        <UButton color="success" variant="subtle" size="sm" icon="i-lucide-eye" :loading="busy" @click="bulkPublish(true)">{{ $t('admin.products.bulkPublish') }}</UButton>
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-eye-off" :loading="busy" @click="bulkPublish(false)">{{ $t('admin.products.bulkUnpublish') }}</UButton>
        <UButton color="error" variant="subtle" size="sm" icon="i-lucide-trash-2" :loading="busy" @click="bulkDelete">{{ $t('admin.products.bulkDelete') }}</UButton>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="clearSelection">{{ $t('admin.products.clearSelection') }}</UButton>
      </div>

      <UiPanel :padded="false">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                <th class="px-6 py-3 w-10">
                  <UCheckbox :model-value="allSelected" :indeterminate="someSelected" :aria-label="$t('admin.products.selectAll')" @update:model-value="toggleAll" />
                </th>
                <th class="px-6 py-3">{{ $t('admin.products.colName') }}</th>
                <th class="px-6 py-3">{{ $t('admin.products.colCategory') }}</th>
                <th class="px-6 py-3">{{ $t('admin.products.colPrice') }}</th>
                <th class="px-6 py-3">{{ $t('admin.products.colStatus') }}</th>
                <th class="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in products"
                :key="p.id"
                class="border-b border-ink-gray-200 last:border-0"
                :class="selected.has(p.id) && 'bg-ink-burgundy/5'"
              >
                <td class="px-6 py-3">
                  <UCheckbox :model-value="selected.has(p.id)" :aria-label="p.title" @update:model-value="toggle(p.id)" />
                </td>
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
    </template>
  </div>
</template>
