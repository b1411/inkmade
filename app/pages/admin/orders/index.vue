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
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Заказы</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-1">Все заказы</h1>
      </div>
      <USelect v-model="filter" :items="statusItems" value-key="value" class="w-56" />
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
    <div v-else-if="!filtered.length" class="py-10 text-center text-ink-gray-600">Заказов нет.</div>

    <table v-else class="w-full text-left border-collapse">
      <thead>
        <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
          <th class="py-2 pr-4">#</th>
          <th class="py-2 pr-4">Дата</th>
          <th class="py-2 pr-4">Позиций</th>
          <th class="py-2 pr-4">Сумма</th>
          <th class="py-2 pr-4">Статус</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in filtered" :key="o.id" class="border-b border-ink-gray-200 hover:bg-ink-gray-200/30">
          <td class="py-3 pr-4">
            <NuxtLink :to="`/admin/orders/${o.id}`" class="ink-label hover:text-ink-burgundy">#{{ shortId(o.id) }}</NuxtLink>
          </td>
          <td class="py-3 pr-4 text-caption">{{ new Date(o.created_at).toLocaleDateString('ru') }}</td>
          <td class="py-3 pr-4">{{ o.order_items?.length ?? 0 }}</td>
          <td class="py-3 pr-4">{{ o.total }} {{ o.currency }}</td>
          <td class="py-3 pr-4"><UBadge :color="badgeColor(o.status)" variant="subtle">{{ STATUS_LABELS[o.status as OrderStatus] }}</UBadge></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
