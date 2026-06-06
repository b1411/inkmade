<script setup lang="ts">
import { PRODUCT_CATEGORIES } from '~/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { listProducts, deleteProduct } = useAdmin()
const toast = useToast()

const { data: products, refresh, pending } = await useAsyncData('admin-products', () => listProducts())

const categoryLabel = (v: string) =>
  PRODUCT_CATEGORIES.find(c => c.value === v)?.label ?? v

async function onDelete(id: string, title: string) {
  if (!confirm(`Удалить товар «${title}»? Действие необратимо.`)) return
  try {
    await deleteProduct(id)
    toast.add({ title: 'Товар удалён', color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка удаления', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Каталог</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-2">Товары</h1>
      </div>
      <UButton to="/admin/products/new" color="primary" icon="i-lucide-plus">Новый товар</UButton>
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>

    <div v-else-if="!products?.length" class="py-10 text-center text-ink-gray-600">
      Товаров пока нет. Создайте первый.
    </div>

    <table v-else class="w-full text-left border-collapse">
      <thead>
        <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
          <th class="py-2 pr-4">Название</th>
          <th class="py-2 pr-4">Категория</th>
          <th class="py-2 pr-4">Цена</th>
          <th class="py-2 pr-4">Статус</th>
          <th class="py-2" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id" class="border-b border-ink-gray-200">
          <td class="py-3 pr-4">
            <NuxtLink :to="`/admin/products/${p.id}`" class="font-semibold hover:text-ink-burgundy">{{ p.title }}</NuxtLink>
            <span class="ink-label text-ink-gray-400 ml-2">{{ p.alias }}</span>
          </td>
          <td class="py-3 pr-4">{{ categoryLabel(p.category) }}</td>
          <td class="py-3 pr-4">{{ p.base_price }} ₸</td>
          <td class="py-3 pr-4">
            <UBadge :color="p.is_active ? 'success' : 'neutral'" variant="subtle">
              {{ p.is_active ? 'Опубликован' : 'Черновик' }}
            </UBadge>
          </td>
          <td class="py-3 text-right">
            <UButton :to="`/admin/products/${p.id}`" color="neutral" variant="ghost" size="sm" icon="i-lucide-pencil" />
            <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="onDelete(p.id, p.title)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
