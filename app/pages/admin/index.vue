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

// «Требует внимания» + чистая прибыль (CRM §6.1)
const { data: attention } = await useAsyncData('admin-attention', async () => {
  const [fin, mod, payouts, problem, lowStock] = await Promise.all([
    supabase.rpc('admin_finance_stats', {}),
    supabase.from('print_library').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['on_hold', 'reprint']),
    supabase.from('variants').select('id', { count: 'exact', head: true }).lte('stock', 5),
  ])
  return {
    profit: (fin.data as { profit?: number } | null)?.profit ?? 0,
    moderation: mod.count ?? 0,
    payouts: payouts.count ?? 0,
    problem: problem.count ?? 0,
    lowStock: lowStock.count ?? 0,
  }
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
  <div>
    <UiPageHeader label="Дашборд" title="Админ-кабинет" />

    <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-24" />
    </div>

    <template v-else>
      <div class="space-y-8">
        <!-- требует внимания -->
        <div v-if="attention" class="flex flex-wrap gap-2">
          <NuxtLink v-if="attention.moderation" to="/admin/designers" class="inline-flex items-center gap-1 bg-ink-warning/10 text-ink-warning rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-image" /> Модерация принтов: {{ attention.moderation }}
          </NuxtLink>
          <NuxtLink v-if="attention.payouts" to="/admin/designers" class="inline-flex items-center gap-1 bg-ink-burgundy/10 text-ink-burgundy rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-wallet" /> Заявки на выплату: {{ attention.payouts }}
          </NuxtLink>
          <NuxtLink v-if="attention.problem" to="/admin/returns" class="inline-flex items-center gap-1 bg-ink-error/10 text-ink-error rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-triangle-alert" /> Проблемные заказы: {{ attention.problem }}
          </NuxtLink>
          <NuxtLink v-if="attention.lowStock" to="/admin/stock" class="inline-flex items-center gap-1 bg-ink-gray-200 text-ink-gray-600 rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-boxes" /> Низкий сток: {{ attention.lowStock }}
          </NuxtLink>
        </div>

        <!-- ключевые метрики -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UiStatCard label="Чистая прибыль" :value="`${fmt(attention?.profit ?? 0)} ₸`" icon="i-lucide-wallet" accent />
          <UiStatCard label="Выручка (оплачено)" :value="`${fmt(stats?.revenue ?? 0)} ₸`" icon="i-lucide-trending-up" />
          <UiStatCard label="Оплаченных заказов" :value="stats?.paid_orders ?? 0" icon="i-lucide-shopping-bag" />
          <UiStatCard label="Всего заказов" :value="stats?.orders_total ?? 0" icon="i-lucide-clipboard-list" />
          <UiStatCard label="Доля брака" :value="`${defectRate}%`" icon="i-lucide-triangle-alert" />
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- заказы по статусам -->
          <UiPanel title="Заказы по статусам" icon="i-lucide-list-checks" :padded="false">
            <div v-if="byStatus.length" class="divide-y divide-ink-gray-200">
              <div v-for="[status, count] in byStatus" :key="status" class="flex justify-between px-6 py-3 text-caption">
                <span>{{ STATUS_LABELS[status] ?? status }}</span>
                <span class="font-semibold">{{ count }}</span>
              </div>
            </div>
            <UiEmptyState v-else icon="i-lucide-clipboard-list" title="Заказов пока нет" />
          </UiPanel>

          <!-- топ товаров -->
          <UiPanel title="Топ товаров" icon="i-lucide-trophy" :padded="false">
            <div v-if="stats?.top_products?.length" class="divide-y divide-ink-gray-200">
              <div v-for="(p, i) in stats.top_products" :key="i" class="flex justify-between px-6 py-3 text-caption">
                <span>{{ p.title }}</span>
                <span class="font-semibold">{{ p.qty }} шт</span>
              </div>
            </div>
            <UiEmptyState v-else icon="i-lucide-package" title="Продаж пока нет" />
          </UiPanel>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton to="/admin/products" color="primary" variant="subtle" icon="i-lucide-package">Товары</UButton>
          <UButton to="/admin/orders" color="primary" variant="subtle" icon="i-lucide-clipboard-list">Заказы</UButton>
          <UButton to="/admin/stock" color="primary" variant="subtle" icon="i-lucide-boxes">Склад</UButton>
          <UButton to="/admin/prints" color="primary" variant="subtle" icon="i-lucide-image">Библиотека принтов</UButton>
        </div>
      </div>
    </template>
  </div>
</template>
