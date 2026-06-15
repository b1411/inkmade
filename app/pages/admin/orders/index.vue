<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS } from '~~/shared/config/order-status'

// Обзор всех заказов (§8.2.3). Admin видит все (RLS). Фильтр по статусу.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const supabase = useSupabaseClient<Database>()
const { data: orders, pending } = await useAsyncData('admin-orders', async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, currency, created_at, order_items(id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
})

const filter = ref<OrderStatus | 'all'>('all')
const statusItems = [
  { label: 'Все', value: 'all' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value })),
]
const filtered = computed(() =>
  filter.value === 'all' ? (orders.value ?? []) : (orders.value ?? []).filter(o => o.status === filter.value),
)

const badgeColor = (s: string) =>
  s === 'delivered' ? 'success' : s === 'cancelled' || s === 'refunded' ? 'error'
    : s === 'on_hold' || s === 'reprint' ? 'warning' : 'neutral'
const shortId = (s: string) => s.slice(0, 8)
</script>

<template>
  <div>
    <UiPageHeader label="Заказы" title="Все заказы" description="Все заказы магазина с фильтром по статусу.">
      <template #actions>
        <USelect v-model="filter" :items="statusItems" value-key="value" class="w-56" />
      </template>
    </UiPageHeader>

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <UiEmptyState v-else-if="!filtered.length" icon="i-lucide-package" title="Заказов нет" text="По выбранному фильтру заказы не найдены." />

    <UiPanel v-else :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="px-6 py-3">#</th>
              <th class="px-6 py-3">Дата</th>
              <th class="px-6 py-3">Позиций</th>
              <th class="px-6 py-3">Сумма</th>
              <th class="px-6 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filtered" :key="o.id" class="border-b border-ink-gray-200 hover:bg-ink-gray-200/30">
              <td class="px-6 py-3">
                <NuxtLink :to="`/admin/orders/${o.id}`" class="ink-label hover:text-ink-burgundy">#{{ shortId(o.id) }}</NuxtLink>
              </td>
              <td class="px-6 py-3 text-caption">{{ new Date(o.created_at).toLocaleDateString('ru') }}</td>
              <td class="px-6 py-3">{{ o.order_items?.length ?? 0 }}</td>
              <td class="px-6 py-3">{{ o.total }} {{ o.currency }}</td>
              <td class="px-6 py-3"><UBadge :color="badgeColor(o.status)" variant="subtle">{{ STATUS_LABELS[o.status as OrderStatus] }}</UBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiPanel>
  </div>
</template>
