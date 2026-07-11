<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS } from '~~/shared/config/order-status'
import { formatPrice } from '~/utils/format'

// Обзор всех заказов (§8.2.3). Admin видит все (RLS). Поиск, фильтр по статусу/периоду,
// сводка и экспорт CSV.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const { dateShort } = useFormat()

const supabase = useSupabaseClient<Database>()
const { data: orders, pending } = await useAsyncData('admin-orders', async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, currency, created_at, paid_at, order_items(id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
})

const filter = ref<OrderStatus | 'all'>('all')
const period = ref<'all' | '7' | '30' | '90'>('all')
const search = ref('')
const statusItems = computed(() => [
  { label: t('admin.orders.filter.allStatuses'), value: 'all' },
  ...(Object.keys(STATUS_LABELS) as OrderStatus[]).map(value => ({ label: t(`domain.orderStatus.${value}`), value })),
])
const periodItems = computed(() => [
  { label: t('admin.orders.filter.periodAll'), value: 'all' },
  { label: t('admin.orders.filter.period7'), value: '7' },
  { label: t('admin.orders.filter.period30'), value: '30' },
  { label: t('admin.orders.filter.period90'), value: '90' },
])

const filtered = computed(() => {
  let list = orders.value ?? []
  if (filter.value !== 'all') list = list.filter(o => o.status === filter.value)
  if (period.value !== 'all') {
    const cut = Date.now() - Number(period.value) * 86400000
    list = list.filter(o => new Date(o.created_at).getTime() >= cut)
  }
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(o => o.id.toLowerCase().includes(q))
  return list
})
const sum = computed(() => filtered.value.reduce((s, o) => s + Number(o.total || 0), 0))
const paidSum = computed(() => filtered.value.filter(o => o.paid_at).reduce((s, o) => s + Number(o.total || 0), 0))

const badgeColor = (s: string) =>
  s === 'delivered' ? 'success' : s === 'cancelled' || s === 'refunded' ? 'error'
    : s === 'on_hold' || s === 'reprint' ? 'warning' : 'neutral'
const shortId = (s: string) => s.slice(0, 8)

function exportCsv() {
  const rows = filtered.value
  if (!rows.length) return
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = [
    t('admin.orders.csv.number'), t('admin.orders.csv.date'), t('admin.orders.csv.items'),
    t('admin.orders.csv.sum'), t('admin.orders.csv.currency'), t('admin.orders.csv.status'),
    t('admin.orders.csv.paid'),
  ]
  const lines = rows.map(o => [
    esc(shortId(o.id)), esc(dateShort(o.created_at)), esc(o.order_items?.length ?? 0),
    esc(o.total), esc(o.currency), esc(t(`domain.orderStatus.${o.status}`)),
    esc(o.paid_at ? t('admin.orders.csv.yes') : t('admin.orders.csv.no')),
  ].join(','))
  const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `inkmade-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.orders.label')" :title="$t('admin.orders.title')" :description="$t('admin.orders.description')">
      <template #actions>
        <UButton to="/admin/orders/new" color="primary" icon="i-lucide-plus">{{ $t('admin.orders.newOrder') }}</UButton>
        <UButton icon="i-lucide-download" color="neutral" variant="subtle" :disabled="!filtered.length" @click="exportCsv">{{ $t('admin.orders.exportCsv') }}</UButton>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <template v-else>
      <!-- сводка по фильтру -->
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        <UiStatCard :label="$t('admin.orders.summary.count')" :value="filtered.length" icon="i-lucide-clipboard-list" />
        <UiStatCard :label="$t('admin.orders.summary.sum')" :value="formatPrice(sum)" icon="i-lucide-sigma" />
        <UiStatCard :label="$t('admin.orders.summary.paid')" :value="formatPrice(paidSum)" icon="i-lucide-wallet" accent />
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <UInput v-model="search" icon="i-lucide-search" :placeholder="$t('admin.orders.searchPlaceholder')" class="w-56" />
        <USelect v-model="filter" :items="statusItems" value-key="value" class="w-52" />
        <USelect v-model="period" :items="periodItems" value-key="value" class="w-52" />
      </div>

      <UiEmptyState v-if="!filtered.length" icon="i-lucide-package" :title="$t('admin.orders.empty.title')" :text="$t('admin.orders.empty.text')" />

      <UiPanel v-else :padded="false">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                <th class="px-6 py-3">{{ $t('admin.orders.table.number') }}</th>
                <th class="px-6 py-3">{{ $t('admin.orders.table.date') }}</th>
                <th class="px-6 py-3">{{ $t('admin.orders.table.items') }}</th>
                <th class="px-6 py-3 text-right">{{ $t('admin.orders.table.sum') }}</th>
                <th class="px-6 py-3">{{ $t('admin.orders.table.payment') }}</th>
                <th class="px-6 py-3">{{ $t('admin.orders.table.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in filtered" :key="o.id" class="border-b border-ink-gray-200 hover:bg-ink-gray-200/30">
                <td class="px-6 py-3">
                  <NuxtLink :to="`/admin/orders/${o.id}`" class="ink-label hover:text-ink-burgundy">#{{ shortId(o.id) }}</NuxtLink>
                </td>
                <td class="px-6 py-3 text-caption">{{ dateShort(o.created_at) }}</td>
                <td class="px-6 py-3">{{ o.order_items?.length ?? 0 }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ formatPrice(o.total) }}</td>
                <td class="px-6 py-3 text-caption">
                  <span v-if="o.paid_at" class="text-ink-success">{{ $t('admin.orders.paid') }}</span>
                  <span v-else class="text-ink-gray-400">—</span>
                </td>
                <td class="px-6 py-3"><UBadge :color="badgeColor(o.status)" variant="subtle">{{ $t(`domain.orderStatus.${o.status}`) }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiPanel>
    </template>
  </div>
</template>
