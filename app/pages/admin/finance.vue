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

function exportCsv() {
  const rows = data.value?.entries ?? []
  const head = 'date,type,amount,currency,note,order_id'
  const body = rows.map(e => [e.created_at, e.entry_type, e.amount, e.currency, (e.note ?? '').replace(/,/g, ' '), e.order_id ?? ''].join(','))
  const csv = [head, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'inkmade-finance.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <UiSectionLabel accent>Финансы</UiSectionLabel>
        <h1 class="ink-display text-h2 mt-1">P&amp;L и аналитика</h1>
      </div>
      <div class="flex items-center gap-2">
        <USelect v-model="period" :items="periods" value-key="value" class="w-36" />
        <UButton color="neutral" variant="subtle" icon="i-lucide-download" @click="exportCsv">CSV</UButton>
      </div>
    </div>

    <div v-if="pending" class="py-6 text-ink-gray-600">Загрузка…</div>
    <template v-else>
      <!-- KPI -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="border border-ink-gray-200 rounded-lg p-4"><p class="ink-label text-ink-gray-600">Выручка</p><p class="text-h3 font-bold mt-1">{{ money(data?.stats?.revenue) }}</p></div>
        <div class="border border-ink-gray-200 rounded-lg p-4"><p class="ink-label text-ink-gray-600">Себестоимость</p><p class="text-h3 font-bold mt-1 text-ink-error">−{{ money(data?.stats?.cogs) }}</p></div>
        <div class="border border-ink-gray-200 rounded-lg p-4"><p class="ink-label text-ink-gray-600">Роялти</p><p class="text-h3 font-bold mt-1 text-ink-error">−{{ money(data?.stats?.royalty) }}</p></div>
        <div class="border border-ink-gray-200 rounded-lg p-4"><p class="ink-label text-ink-gray-600">Возвраты</p><p class="text-h3 font-bold mt-1 text-ink-error">−{{ money(data?.stats?.refund) }}</p></div>
        <div class="border-2 border-ink-burgundy rounded-lg p-4 bg-ink-burgundy/5"><p class="ink-label text-ink-burgundy">Чистая прибыль</p><p class="text-h3 font-bold mt-1 text-ink-burgundy">{{ money(data?.stats?.profit) }}</p></div>
      </div>

      <!-- динамика по дням -->
      <section v-if="data?.series?.length">
        <div class="flex items-center gap-4">
          <UiSectionLabel accent>Динамика</UiSectionLabel>
          <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-burgundy inline-block" /> выручка</span>
          <span class="text-caption flex items-center gap-1"><span class="size-2.5 rounded-sm bg-ink-success inline-block" /> прибыль</span>
        </div>
        <div class="mt-4 flex items-end gap-1 h-48 overflow-x-auto border-b border-ink-gray-200 pb-1">
          <div v-for="d in data.series" :key="d.day" class="flex flex-col items-center justify-end gap-0.5 shrink-0" :title="`${d.day}: выручка ${money(d.revenue)}, прибыль ${money(d.profit)}`">
            <div class="flex items-end gap-0.5 h-40">
              <div class="w-2 bg-ink-burgundy rounded-t" :style="{ height: `${Math.max(2, (Number(d.revenue) / chartMax) * 100)}%` }" />
              <div class="w-2 rounded-t" :class="Number(d.profit) >= 0 ? 'bg-ink-success' : 'bg-ink-error'" :style="{ height: `${Math.max(2, (Math.abs(Number(d.profit)) / chartMax) * 100)}%` }" />
            </div>
            <span class="text-[10px] text-ink-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">{{ dayShort(d.day) }}</span>
          </div>
        </div>
      </section>

      <!-- маржа по разрезам -->
      <div class="grid lg:grid-cols-2 gap-6">
        <section>
          <UiSectionLabel accent>Маржа по изделиям</UiSectionLabel>
          <table v-if="data?.margin?.by_product?.length" class="w-full text-caption mt-3">
            <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
              <th class="text-left py-2">Изделие</th><th class="text-right">Шт</th><th class="text-right">Выручка</th><th class="text-right">Маржа</th>
            </tr></thead>
            <tbody>
              <tr v-for="p in data.margin.by_product" :key="p.title" class="border-b border-ink-gray-200/60">
                <td class="py-2">{{ p.title }}</td>
                <td class="text-right">{{ p.qty }}</td>
                <td class="text-right">{{ money(p.revenue) }}</td>
                <td class="text-right font-semibold" :class="Number(p.margin) >= 0 ? 'text-ink-burgundy' : 'text-ink-error'">{{ money(p.margin) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-caption text-ink-gray-500 mt-3">Продаж пока нет.</p>
        </section>

        <section>
          <UiSectionLabel accent>Маржа по методам</UiSectionLabel>
          <table v-if="data?.margin?.by_method?.length" class="w-full text-caption mt-3">
            <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
              <th class="text-left py-2">Метод</th><th class="text-right">Шт</th><th class="text-right">Выручка</th><th class="text-right">Маржа</th>
            </tr></thead>
            <tbody>
              <tr v-for="m in data.margin.by_method" :key="m.method" class="border-b border-ink-gray-200/60">
                <td class="py-2 uppercase">{{ m.method }}</td>
                <td class="text-right">{{ m.qty }}</td>
                <td class="text-right">{{ money(m.revenue) }}</td>
                <td class="text-right font-semibold" :class="Number(m.margin) >= 0 ? 'text-ink-burgundy' : 'text-ink-error'">{{ money(m.margin) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-caption text-ink-gray-500 mt-3">Продаж пока нет.</p>
        </section>
      </div>

      <!-- леджер -->
      <div>
        <UiSectionLabel accent>Леджер</UiSectionLabel>
        <div class="mt-3 border border-ink-gray-200 rounded-lg divide-y divide-ink-gray-200 text-caption">
          <div v-for="e in data?.entries" :key="e.id" class="flex items-center justify-between p-3">
            <span class="text-ink-gray-500 w-28">{{ new Date(e.created_at).toLocaleDateString('ru') }}</span>
            <span class="flex-1">{{ typeLabel[e.entry_type] ?? e.entry_type }}<span v-if="e.note" class="text-ink-gray-400"> · {{ e.note }}</span></span>
            <span class="font-semibold" :class="e.entry_type === 'revenue' ? 'text-ink-success' : 'text-ink-error'">
              {{ e.entry_type === 'revenue' ? '+' : '−' }}{{ money(Math.abs(Number(e.amount))) }}
            </span>
          </div>
          <div v-if="!data?.entries?.length" class="p-4 text-ink-gray-500">Движений пока нет — появятся после оплат.</div>
        </div>
      </div>
    </template>
  </div>
</template>
