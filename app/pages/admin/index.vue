<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Дашборд админа (§8.2.5): выручка, заказы по статусам, топ товаров, доля брака.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
useHead({ title: 'Дашборд — INKMADE' })

interface Stats {
  revenue: number
  orders_total: number
  paid_orders: number
  by_status: Record<string, number>
  reprints: number
  top_products: { title: string; qty: number }[]
}

const supabase = useSupabaseClient<Database>()
const { data: stats, pending } = await useAsyncData('admin-stats', async () => {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw error
  return data as unknown as Stats
})

const STATUS_LABELS: Record<string, string> = {
  created: 'Создан', pending: 'Ожидает оплаты', paid: 'Оплачен', queued: 'В очереди',
  printing: 'Печать', quality_check: 'Контроль', packing: 'Упаковка',
  ready_to_ship: 'К отгрузке', shipped: 'Отправлен', delivered: 'Доставлен',
  on_hold: 'Пауза', reprint: 'Перепечать', cancelled: 'Отменён', refunded: 'Возврат',
}

const byStatus = computed(() => Object.entries(stats.value?.by_status ?? {}))
const defectRate = computed(() => {
  const paid = stats.value?.paid_orders ?? 0
  return paid > 0 ? Math.round(((stats.value?.reprints ?? 0) / paid) * 100) : 0
})
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n)
</script>

<template>
  <div class="space-y-8">
    <div>
      <UiSectionLabel accent>Дашборд</UiSectionLabel>
      <h1 class="ink-display text-2xl mt-2">Админ-кабинет</h1>
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка аналитики…</div>

    <template v-else>
      <!-- ключевые метрики -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <p class="ink-label text-ink-gray-400">Выручка (оплачено)</p>
          <p class="text-2xl font-bold text-ink-burgundy mt-1">{{ fmt(stats?.revenue ?? 0) }} ₸</p>
        </div>
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <p class="ink-label text-ink-gray-400">Оплаченных заказов</p>
          <p class="text-2xl font-bold mt-1">{{ stats?.paid_orders ?? 0 }}</p>
        </div>
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <p class="ink-label text-ink-gray-400">Всего заказов</p>
          <p class="text-2xl font-bold mt-1">{{ stats?.orders_total ?? 0 }}</p>
        </div>
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <p class="ink-label text-ink-gray-400">Доля брака</p>
          <p class="text-2xl font-bold mt-1" :class="defectRate > 5 ? 'text-ink-error' : ''">{{ defectRate }}%</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- заказы по статусам -->
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <UiSectionLabel>Заказы по статусам</UiSectionLabel>
          <div v-if="byStatus.length" class="mt-3 space-y-2">
            <div v-for="[status, count] in byStatus" :key="status" class="flex justify-between text-caption">
              <span>{{ STATUS_LABELS[status] ?? status }}</span>
              <span class="font-semibold">{{ count }}</span>
            </div>
          </div>
          <p v-else class="text-ink-gray-600 mt-3">Заказов пока нет.</p>
        </div>

        <!-- топ товаров -->
        <div class="border border-ink-gray-200 rounded-lg p-5">
          <UiSectionLabel>Топ товаров</UiSectionLabel>
          <div v-if="stats?.top_products?.length" class="mt-3 space-y-2">
            <div v-for="(p, i) in stats.top_products" :key="i" class="flex justify-between text-caption">
              <span>{{ p.title }}</span>
              <span class="font-semibold">{{ p.qty }} шт</span>
            </div>
          </div>
          <p v-else class="text-ink-gray-600 mt-3">Продаж пока нет.</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton to="/admin/products" color="primary" variant="subtle" icon="i-lucide-package">Товары</UButton>
        <UButton to="/admin/orders" color="primary" variant="subtle" icon="i-lucide-clipboard-list">Заказы</UButton>
        <UButton to="/admin/stock" color="primary" variant="subtle" icon="i-lucide-boxes">Склад</UButton>
        <UButton to="/admin/prints" color="primary" variant="subtle" icon="i-lucide-image">Библиотека принтов</UButton>
      </div>
    </template>
  </div>
</template>
