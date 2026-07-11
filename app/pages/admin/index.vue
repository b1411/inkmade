<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { FEATURES } from '~~/shared/config/features'

// Дашборд админа (§8.2.5): выручка, заказы по статусам, топ товаров, доля брака.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t, te } = useI18n()
useHead({ title: t('admin.dashboard.headTitle') })

interface Stats {
  revenue: number
  orders_total: number
  paid_orders: number
  by_status: Record<string, number>
  reprints: number
  top_products: { title: string; qty: number }[]
}

const supabase = useSupabaseClient<Database>()
const { data: stats, pending, error: statsError } = await useAsyncData('admin-stats', async () => {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw error
  return data as unknown as Stats
})

const from30 = new Date(Date.now() - 29 * 86400000).toISOString()

// «Требует внимания» + чистая прибыль + новые клиенты за 30 дней (CRM §6.1)
const { data: attention } = await useAsyncData('admin-attention', async () => {
  const [fin, mod, payouts, problem, lowStock, newCust] = await Promise.all([
    supabase.rpc('admin_finance_stats', {}),
    supabase.from('print_library').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['on_hold', 'reprint']),
    supabase.from('variants').select('id', { count: 'exact', head: true }).lte('stock', 5),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', from30),
  ])
  // Заявки на B2B-магазины — только при включённой фиче (иначе таблицы может не быть)
  const shopApps = FEATURES.b2bShops
    ? await supabase.from('shop_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    : { count: 0 }
  return {
    profit: (fin.data as { profit?: number } | null)?.profit ?? 0,
    moderation: mod.count ?? 0,
    payouts: payouts.count ?? 0,
    problem: problem.count ?? 0,
    lowStock: lowStock.count ?? 0,
    newCustomers: newCust.count ?? 0,
    shopApps: shopApps.count ?? 0,
  }
})

// тренд выручки за 30 дней (мини-график)
const { series } = useFinance()
const { data: trend } = await useAsyncData('admin-trend', () =>
  series(from30, new Date().toISOString()),
)
const maxRev = computed(() => Math.max(1, ...((trend.value ?? []).map(d => d.revenue))))
const avgCheck = computed(() => {
  const paid = stats.value?.paid_orders ?? 0
  return paid > 0 ? Math.round((stats.value?.revenue ?? 0) / paid) : 0
})
const conversion = computed(() => {
  const total = stats.value?.orders_total ?? 0
  return total > 0 ? Math.round(((stats.value?.paid_orders ?? 0) / total) * 100) : 0
})

const statusLabel = (s: string) => te(`admin.dashboard.status.${s}`) ? t(`admin.dashboard.status.${s}`) : s

const byStatus = computed(() => Object.entries(stats.value?.by_status ?? {}))
const defectRate = computed(() => {
  const paid = stats.value?.paid_orders ?? 0
  return paid > 0 ? Math.round(((stats.value?.reprints ?? 0) / paid) * 100) : 0
})
const { number: fmt, date } = useFormat()
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.dashboard.label')" :title="$t('admin.dashboard.title')" />

    <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-24" />
    </div>

    <!-- ошибка загрузки: НЕ показываем фейковые ₸0 KPI на денежном дашборде (аудит #7) -->
    <UiEmptyState
      v-else-if="statsError"
      icon="i-lucide-alert-triangle"
      :title="$t('admin.dashboard.loadError.title')"
      :text="$t('admin.dashboard.loadError.text')"
    />

    <template v-else>
      <div class="space-y-8">
        <!-- требует внимания -->
        <div v-if="attention" class="flex flex-wrap gap-2">
          <NuxtLink v-if="FEATURES.designerMarketplace && attention.moderation" to="/admin/designers" class="inline-flex items-center gap-1 bg-ink-warning/10 text-ink-warning rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-image" /> {{ $t('admin.dashboard.attention.moderation', { n: attention.moderation }) }}
          </NuxtLink>
          <NuxtLink v-if="FEATURES.designerMarketplace && attention.payouts" to="/admin/designers" class="inline-flex items-center gap-1 bg-ink-burgundy/10 text-ink-burgundy rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-wallet" /> {{ $t('admin.dashboard.attention.payouts', { n: attention.payouts }) }}
          </NuxtLink>
          <NuxtLink v-if="attention.problem" to="/admin/returns" class="inline-flex items-center gap-1 bg-ink-error/10 text-ink-error rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-triangle-alert" /> {{ $t('admin.dashboard.attention.problem', { n: attention.problem }) }}
          </NuxtLink>
          <NuxtLink v-if="attention.lowStock" to="/admin/stock" class="inline-flex items-center gap-1 bg-ink-gray-200 text-ink-gray-600 rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-boxes" /> {{ $t('admin.dashboard.attention.lowStock', { n: attention.lowStock }) }}
          </NuxtLink>
          <NuxtLink v-if="FEATURES.b2bShops && attention.shopApps" to="/admin/shops" class="inline-flex items-center gap-1 bg-ink-burgundy/10 text-ink-burgundy rounded-full px-3 py-1 text-caption font-semibold">
            <UIcon name="i-lucide-store" /> {{ $t('admin.dashboard.attention.shopApps', { n: attention.shopApps }) }}
          </NuxtLink>
        </div>

        <!-- ключевые метрики -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UiStatCard :label="$t('admin.dashboard.kpi.profit')" :value="`${fmt(attention?.profit ?? 0)} ₸`" icon="i-lucide-wallet" accent />
          <UiStatCard :label="$t('admin.dashboard.kpi.revenuePaid')" :value="`${fmt(stats?.revenue ?? 0)} ₸`" icon="i-lucide-trending-up" />
          <UiStatCard :label="$t('admin.dashboard.kpi.paidOrders')" :value="stats?.paid_orders ?? 0" icon="i-lucide-shopping-bag" />
          <UiStatCard :label="$t('admin.dashboard.kpi.totalOrders')" :value="stats?.orders_total ?? 0" icon="i-lucide-clipboard-list" />
          <UiStatCard :label="$t('admin.dashboard.kpi.avgCheck')" :value="`${fmt(avgCheck)} ₸`" icon="i-lucide-receipt" />
          <UiStatCard :label="$t('admin.dashboard.kpi.conversion')" :value="`${conversion}%`" icon="i-lucide-percent" />
          <UiStatCard :label="$t('admin.dashboard.kpi.newCustomers')" :value="attention?.newCustomers ?? 0" icon="i-lucide-user-plus" />
          <UiStatCard :label="$t('admin.dashboard.kpi.defectRate')" :value="`${defectRate}%`" icon="i-lucide-triangle-alert" />
        </div>

        <!-- тренд выручки за 30 дней -->
        <UiPanel :title="$t('admin.dashboard.trend.title')" icon="i-lucide-bar-chart-3">
          <div v-if="trend?.length" class="flex items-end gap-0.5 h-32">
            <div
              v-for="d in trend"
              :key="d.day"
              class="flex-1 bg-ink-burgundy/70 hover:bg-ink-burgundy rounded-t transition-colors min-h-0.5"
              :style="{ height: Math.round((d.revenue / maxRev) * 100) + '%' }"
              :title="$t('admin.dashboard.trend.tooltip', { date: date(d.day), amount: fmt(d.revenue) })"
            />
          </div>
          <p v-else class="text-caption text-ink-gray-400">{{ $t('admin.dashboard.trend.empty') }}</p>
        </UiPanel>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- заказы по статусам -->
          <UiPanel :title="$t('admin.dashboard.byStatus.title')" icon="i-lucide-list-checks" :padded="false">
            <div v-if="byStatus.length" class="divide-y divide-ink-gray-200">
              <div v-for="[status, count] in byStatus" :key="status" class="flex justify-between px-6 py-3 text-caption">
                <span>{{ statusLabel(status) }}</span>
                <span class="font-semibold">{{ count }}</span>
              </div>
            </div>
            <UiEmptyState v-else icon="i-lucide-clipboard-list" :title="$t('admin.dashboard.byStatus.empty')" />
          </UiPanel>

          <!-- топ товаров -->
          <UiPanel :title="$t('admin.dashboard.topProducts.title')" icon="i-lucide-trophy" :padded="false">
            <div v-if="stats?.top_products?.length" class="divide-y divide-ink-gray-200">
              <div v-for="(p, i) in stats.top_products" :key="i" class="flex justify-between px-6 py-3 text-caption">
                <span>{{ p.title }}</span>
                <span class="font-semibold">{{ p.qty }} {{ $t('units.pcs') }}</span>
              </div>
            </div>
            <UiEmptyState v-else icon="i-lucide-package" :title="$t('admin.dashboard.topProducts.empty')" />
          </UiPanel>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton to="/admin/products" color="primary" variant="subtle" icon="i-lucide-package">{{ $t('admin.dashboard.shortcuts.products') }}</UButton>
          <UButton to="/admin/orders" color="primary" variant="subtle" icon="i-lucide-clipboard-list">{{ $t('admin.dashboard.shortcuts.orders') }}</UButton>
          <UButton to="/admin/stock" color="primary" variant="subtle" icon="i-lucide-boxes">{{ $t('admin.dashboard.shortcuts.stock') }}</UButton>
          <UButton to="/admin/prints" color="primary" variant="subtle" icon="i-lucide-image">{{ $t('admin.dashboard.shortcuts.prints') }}</UButton>
        </div>
      </div>
    </template>
  </div>
</template>
