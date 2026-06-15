<script setup lang="ts">
// Финансы CRM (§6.1, §6.2): P&L + динамика по дням + маржа по разрезам + леджер + CSV.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const fin = useFinance()

// период
const periods = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Всё время', value: 0 },
]
const period = ref(30)
function rangeFor(days: number): { from?: string; to?: string } {
  if (!days) return {}
  const to = new Date()
  const from = new Date(to.getTime() - days * 86400000)
  return { from: from.toISOString(), to: to.toISOString() }
}

const { data, pending, refresh } = await useAsyncData('admin-finance', async () => {
  const { from, to } = rangeFor(period.value)
  const [stats, series, margin, entries] = await Promise.all([
    fin.stats(from, to), fin.series(from, to), fin.marginBreakdown(), fin.entries(300),
  ])
  return { stats, series, margin, entries }
}, { watch: [period] })

const money = (n: number | null | undefined) => `${Math.round(Number(n) || 0).toLocaleString('ru')} ₸`
const typeLabel: Record<string, string> = {
  revenue: 'Выручка', cogs: 'Себестоимость', royalty: 'Роялти', acquiring_fee: 'Эквайринг', shipping: 'Доставка', refund: 'Возврат', other: 'Прочее',
}

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
  const periodLabel = periods.find(p => p.value === period.value)?.label ?? ''
  const turnover = (Number(s.revenue) || 0) - (Number(s.refund) || 0)
  const tax = Math.round(turnover * 0.03)
  const rows: [string, string | number][] = [
    ['Период', periodLabel],
    ['Выручка', Math.round(Number(s.revenue) || 0)],
    ['Возвраты', Math.round(Number(s.refund) || 0)],
    ['Чистый оборот', Math.round(turnover)],
    ['Себестоимость', Math.round(Number(s.cogs) || 0)],
    ['Роялти дизайнерам', Math.round(Number(s.royalty) || 0)],
    ['Чистая прибыль', Math.round(Number(s.profit) || 0)],
    ['Оценочный налог (упрощёнка ~3% от оборота)', tax],
  ]
  downloadCsv(rows.map(r => `${r[0]},${r[1]}`).join('\n'), 'inkmade-tax.csv')
}
</script>

<template>
  <div>
    <UiPageHeader label="Финансы" title="P&amp;L и аналитика">
      <template #actions>
        <USelect v-model="period" :items="periods" value-key="value" class="w-36" />
        <UButton color="neutral" variant="subtle" icon="i-lucide-download" @click="exportCsv">CSV</UButton>
        <UButton color="neutral" variant="subtle" icon="i-lucide-receipt" @click="exportTaxCsv">Налоговый</UButton>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-24" />
    </div>
    <template v-else>
      <div class="space-y-8">
        <!-- KPI -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <UiStatCard label="Выручка" :value="money(data?.stats?.revenue)" icon="i-lucide-trending-up" />
          <UiStatCard label="Себестоимость" :value="`−${money(data?.stats?.cogs)}`" icon="i-lucide-factory" />
          <UiStatCard label="Роялти" :value="`−${money(data?.stats?.royalty)}`" icon="i-lucide-palette" />
          <UiStatCard label="Возвраты" :value="`−${money(data?.stats?.refund)}`" icon="i-lucide-rotate-ccw" />
          <UiStatCard label="Чистая прибыль" :value="money(data?.stats?.profit)" icon="i-lucide-wallet" accent />
        </div>

        <!-- динамика по дням -->
        <UiPanel v-if="data?.series?.length" title="Динамика" icon="i-lucide-bar-chart-3">
          <template #actions>
            <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-burgundy inline-block" /> выручка</span>
            <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-success inline-block" /> прибыль</span>
          </template>
          <div class="flex items-end gap-1 h-48 overflow-x-auto border-b border-ink-gray-200 pb-1">
            <div v-for="d in data.series" :key="d.day" class="flex flex-col items-center justify-end gap-0.5 shrink-0" :title="`${d.day}: выручка ${money(d.revenue)}, прибыль ${money(d.profit)}`">
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
          <UiPanel title="Маржа по изделиям" icon="i-lucide-shirt" :padded="false">
            <div v-if="data?.margin?.by_product?.length" class="overflow-x-auto">
              <table class="w-full text-caption">
                <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
                  <th class="text-left px-6 py-2">Изделие</th><th class="text-right">Шт</th><th class="text-right">Выручка</th><th class="text-right px-6">Маржа</th>
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
            <UiEmptyState v-else icon="i-lucide-package" title="Продаж пока нет" />
          </UiPanel>

          <UiPanel title="Маржа по методам" icon="i-lucide-printer" :padded="false">
            <div v-if="data?.margin?.by_method?.length" class="overflow-x-auto">
              <table class="w-full text-caption">
                <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
                  <th class="text-left px-6 py-2">Метод</th><th class="text-right">Шт</th><th class="text-right">Выручка</th><th class="text-right px-6">Маржа</th>
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
            <UiEmptyState v-else icon="i-lucide-package" title="Продаж пока нет" />
          </UiPanel>
        </div>

        <!-- леджер -->
        <UiPanel title="Леджер" icon="i-lucide-receipt-text" :padded="false">
          <div v-if="data?.entries?.length" class="divide-y divide-ink-gray-200 text-caption">
            <div v-for="e in data.entries" :key="e.id" class="flex items-center justify-between px-6 py-3">
              <span class="text-ink-gray-500 w-28">{{ new Date(e.created_at).toLocaleDateString('ru') }}</span>
              <span class="flex-1">{{ typeLabel[e.entry_type] ?? e.entry_type }}<span v-if="e.note" class="text-ink-gray-400"> · {{ e.note }}</span></span>
              <span class="font-semibold" :class="e.entry_type === 'revenue' ? 'text-ink-success' : 'text-ink-error'">
                {{ e.entry_type === 'revenue' ? '+' : '−' }}{{ money(Math.abs(Number(e.amount))) }}
              </span>
            </div>
          </div>
          <UiEmptyState v-else icon="i-lucide-receipt" title="Движений пока нет" text="Появятся после оплат." />
        </UiPanel>
      </div>
    </template>
  </div>
</template>
