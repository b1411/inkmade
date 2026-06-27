<script setup lang="ts">
// Финансы CRM (§6.1, §6.2): P&L + динамика по дням + маржа по разрезам + леджер + CSV.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const fin = useFinance()

// период
const periods = computed(() => [
  { label: t('admin.finance.period.d7'), value: 7 },
  { label: t('admin.finance.period.d30'), value: 30 },
  { label: t('admin.finance.period.d90'), value: 90 },
  { label: t('admin.finance.period.all'), value: 0 },
])
const period = ref(30)
function rangeFor(days: number): { from?: string; to?: string } {
  if (!days) return {}
  const to = new Date()
  const from = new Date(to.getTime() - days * 86400000)
  return { from: from.toISOString(), to: to.toISOString() }
}

const { data, pending } = await useAsyncData('admin-finance', async () => {
  const { from, to } = rangeFor(period.value)
  const [stats, series, margin, entries] = await Promise.all([
    fin.stats(from, to), fin.series(from, to), fin.marginBreakdown(), fin.entries(300),
  ])
  return { stats, series, margin, entries }
}, { watch: [period] })

const money = (n: number | null | undefined) => `${Math.round(Number(n) || 0).toLocaleString('ru')} ₸`
const { te } = useI18n()
const typeLabel = (type: string) => te(`admin.finance.type.${type}`) ? t(`admin.finance.type.${type}`) : type

// масштаб графика
const chartMax = computed(() => {
  const s = data.value?.series ?? []
  return Math.max(1, ...s.map(d => Math.max(Number(d.revenue), Number(d.profit))))
})
const dayShort = (iso: string) => iso.slice(5) // MM-DD

function downloadCsv(csv: string, name: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportCsv() {
  const rows = data.value?.entries ?? []
  const head = 'date,type,amount,currency,note,order_id'
  const body = rows.map(e => [e.created_at, e.entry_type, e.amount, e.currency, (e.note ?? '').replace(/,/g, ' '), e.order_id ?? ''].join(','))
  downloadCsv([head, ...body].join('\n'), 'inkmade-finance.csv')
}

// налоговый экспорт для бухгалтера (§6.2): сводка оборота и P&L за период.
// Оценочный налог по упрощёнке РК (~3% от оборота, ф.910) — справочно, не замена расчёту бухгалтера.
function exportTaxCsv() {
  const s = data.value?.stats
  if (!s) return
  const periodLabel = periods.value.find(p => p.value === period.value)?.label ?? ''
  const turnover = (Number(s.revenue) || 0) - (Number(s.refund) || 0)
  const tax = Math.round(turnover * 0.03)
  const rows: [string, string | number][] = [
    [t('admin.finance.taxCsv.period'), periodLabel],
    [t('admin.finance.taxCsv.revenue'), Math.round(Number(s.revenue) || 0)],
    [t('admin.finance.taxCsv.refund'), Math.round(Number(s.refund) || 0)],
    [t('admin.finance.taxCsv.turnover'), Math.round(turnover)],
    [t('admin.finance.taxCsv.cogs'), Math.round(Number(s.cogs) || 0)],
    [t('admin.finance.taxCsv.royalty'), Math.round(Number(s.royalty) || 0)],
    [t('admin.finance.taxCsv.profit'), Math.round(Number(s.profit) || 0)],
    [t('admin.finance.taxCsv.estTax'), tax],
  ]
  downloadCsv(rows.map(r => `${r[0]},${r[1]}`).join('\n'), 'inkmade-tax.csv')
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.finance.label')" :title="$t('admin.finance.title')">
      <template #actions>
        <USelect v-model="period" :items="periods" value-key="value" class="w-36" />
        <UButton color="neutral" variant="subtle" icon="i-lucide-download" @click="exportCsv">{{ $t('admin.finance.csv') }}</UButton>
        <UButton color="neutral" variant="subtle" icon="i-lucide-receipt" @click="exportTaxCsv">{{ $t('admin.finance.tax') }}</UButton>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-24" />
    </div>
    <template v-else>
      <div class="space-y-8">
        <!-- KPI -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <UiStatCard :label="$t('admin.finance.kpi.revenue')" :value="money(data?.stats?.revenue)" icon="i-lucide-trending-up" />
          <UiStatCard :label="$t('admin.finance.kpi.cogs')" :value="`−${money(data?.stats?.cogs)}`" icon="i-lucide-factory" />
          <UiStatCard :label="$t('admin.finance.kpi.royalty')" :value="`−${money(data?.stats?.royalty)}`" icon="i-lucide-palette" />
          <UiStatCard :label="$t('admin.finance.kpi.refund')" :value="`−${money(data?.stats?.refund)}`" icon="i-lucide-rotate-ccw" />
          <UiStatCard :label="$t('admin.finance.kpi.profit')" :value="money(data?.stats?.profit)" icon="i-lucide-wallet" accent />
        </div>

        <!-- динамика по дням -->
        <UiPanel v-if="data?.series?.length" :title="$t('admin.finance.chart.title')" icon="i-lucide-bar-chart-3">
          <template #actions>
            <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-burgundy inline-block" /> {{ $t('admin.finance.chart.revenue') }}</span>
            <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-success inline-block" /> {{ $t('admin.finance.chart.profit') }}</span>
          </template>
          <div class="flex items-end gap-1 h-48 overflow-x-auto border-b border-ink-gray-200 pb-1">
            <div v-for="d in data.series" :key="d.day" class="flex flex-col items-center justify-end gap-0.5 shrink-0" :title="$t('admin.finance.chart.tooltip', { day: d.day, revenue: money(d.revenue), profit: money(d.profit) })">
              <div class="flex items-end gap-0.5 h-40">
                <div class="w-2 bg-ink-burgundy rounded-t" :style="{ height: `${Math.max(2, (Number(d.revenue) / chartMax) * 100)}%` }" />
                <div class="w-2 rounded-t" :class="Number(d.profit) >= 0 ? 'bg-ink-success' : 'bg-ink-error'" :style="{ height: `${Math.max(2, (Math.abs(Number(d.profit)) / chartMax) * 100)}%` }" />
              </div>
              <span class="text-[10px] text-ink-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">{{ dayShort(d.day) }}</span>
            </div>
          </div>
        </UiPanel>

        <!-- маржа по разрезам -->
        <div class="grid lg:grid-cols-2 gap-6">
          <UiPanel :title="$t('admin.finance.byProduct.title')" icon="i-lucide-shirt" :padded="false">
            <div v-if="data?.margin?.by_product?.length" class="overflow-x-auto">
              <table class="w-full text-caption">
                <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
                  <th class="text-left px-6 py-2">{{ $t('admin.finance.byProduct.product') }}</th><th class="text-right">{{ $t('admin.finance.byProduct.qty') }}</th><th class="text-right">{{ $t('admin.finance.byProduct.revenue') }}</th><th class="text-right px-6">{{ $t('admin.finance.byProduct.margin') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="p in data.margin.by_product" :key="p.title" class="border-b border-ink-gray-200/60">
                    <td class="px-6 py-2">{{ p.title }}</td>
                    <td class="text-right">{{ p.qty }}</td>
                    <td class="text-right">{{ money(p.revenue) }}</td>
                    <td class="text-right px-6 font-semibold" :class="Number(p.margin) >= 0 ? 'text-ink-burgundy' : 'text-ink-error'">{{ money(p.margin) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <UiEmptyState v-else icon="i-lucide-package" :title="$t('admin.finance.byProduct.empty')" />
          </UiPanel>

          <UiPanel :title="$t('admin.finance.byMethod.title')" icon="i-lucide-printer" :padded="false">
            <div v-if="data?.margin?.by_method?.length" class="overflow-x-auto">
              <table class="w-full text-caption">
                <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
                  <th class="text-left px-6 py-2">{{ $t('admin.finance.byMethod.method') }}</th><th class="text-right">{{ $t('admin.finance.byMethod.qty') }}</th><th class="text-right">{{ $t('admin.finance.byMethod.revenue') }}</th><th class="text-right px-6">{{ $t('admin.finance.byMethod.margin') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="m in data.margin.by_method" :key="m.method" class="border-b border-ink-gray-200/60">
                    <td class="px-6 py-2 uppercase">{{ m.method }}</td>
                    <td class="text-right">{{ m.qty }}</td>
                    <td class="text-right">{{ money(m.revenue) }}</td>
                    <td class="text-right px-6 font-semibold" :class="Number(m.margin) >= 0 ? 'text-ink-burgundy' : 'text-ink-error'">{{ money(m.margin) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <UiEmptyState v-else icon="i-lucide-package" :title="$t('admin.finance.byMethod.empty')" />
          </UiPanel>
        </div>

        <!-- леджер -->
        <UiPanel :title="$t('admin.finance.ledger.title')" icon="i-lucide-receipt-text" :padded="false">
          <div v-if="data?.entries?.length" class="divide-y divide-ink-gray-200 text-caption">
            <div v-for="e in data.entries" :key="e.id" class="flex items-center justify-between px-6 py-3">
              <span class="text-ink-gray-500 w-28">{{ new Date(e.created_at).toLocaleDateString('ru') }}</span>
              <span class="flex-1">{{ typeLabel(e.entry_type) }}<span v-if="e.note" class="text-ink-gray-400"> · {{ e.note }}</span></span>
              <span class="font-semibold" :class="e.entry_type === 'revenue' ? 'text-ink-success' : 'text-ink-error'">
                {{ e.entry_type === 'revenue' ? '+' : '−' }}{{ money(Math.abs(Number(e.amount))) }}
              </span>
            </div>
          </div>
          <UiEmptyState v-else icon="i-lucide-receipt" :title="$t('admin.finance.ledger.empty.title')" :text="$t('admin.finance.ledger.empty.text')" />
        </UiPanel>
      </div>
    </template>
  </div>
</template>
