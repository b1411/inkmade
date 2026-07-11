<script setup lang="ts">
// Склад заготовок для цеха (CRM §5.1): просмотр остатков + фиксация брака (defect).
// Приход заводит админ; оператор только видит и списывает брак.
// Фаза O3: списание N единиц (а не фикс −1), поиск/фильтр, алерты низкого остатка.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })
const { listStock, addMovement, listMovements } = useStock()
const toast = useToast()
const { t } = useI18n()
const { dateTime } = useFormat()

const { data: stock, refresh, pending } = await useAsyncData('studio-stock', () => listStock())

type StockRow = NonNullable<typeof stock.value>[number]

// порог низкого остатка (шт). Источник правды один — заменяет инлайн n<=5.
const LOW_THRESHOLD = 5
const low = (n: number) => n <= LOW_THRESHOLD

// ── поиск + фильтр низкого остатка ──
const q = ref('')
const onlyLow = ref(false)
function matchesQuery(v: StockRow): boolean {
  const term = q.value.trim().toLowerCase()
  if (!term) return true
  return (v.products?.title ?? '').toLowerCase().includes(term)
    || (v.sku ?? '').toLowerCase().includes(term)
    || (v.color_name ?? '').toLowerCase().includes(term)
}
const filtered = computed<StockRow[]>(() =>
  (stock.value ?? []).filter(v => matchesQuery(v) && (!onlyLow.value || low(v.stock))),
)
const lowCount = computed(() => (stock.value ?? []).filter(v => low(v.stock) && v.stock > 0).length)
const zeroCount = computed(() => (stock.value ?? []).filter(v => v.stock === 0).length)

// ── списание брака: количество, а не фикс −1 ──
const defect = reactive({ open: false, variantId: '', label: '', max: 0, qty: 1, busy: false })
function openDefect(v: StockRow) {
  Object.assign(defect, {
    open: true,
    variantId: v.id,
    label: `${v.products?.title} · ${v.color_name}/${v.size}`,
    max: v.stock,
    qty: v.stock > 0 ? 1 : 0,
    busy: false,
  })
}
async function confirmDefect() {
  const qty = Math.min(Math.max(1, Math.round(Number(defect.qty) || 0)), defect.max)
  if (qty < 1) return
  defect.busy = true
  try {
    await addMovement(defect.variantId, -qty, 'defect')
    await refresh()
    toast.add({ title: t('studio.stock.toast.defectWrittenOff', { n: qty }), color: 'success' })
    defect.open = false
  } catch (e) {
    toast.add({ title: t('studio.stock.toast.error'), description: getFetchMessage(e), color: 'error' })
  } finally { defect.busy = false }
}

// ── история движений по варианту (CRM §5.1) ──
const REASON_LABELS = computed<Record<string, string>>(() => ({
  purchase: t('studio.stock.reason.purchase'),
  correction: t('studio.stock.reason.correction'),
  defect: t('studio.stock.reason.defect'),
  order: t('studio.stock.reason.order'),
}))
const history = reactive({ open: false, title: '', loading: false, rows: [] as { id: string; delta: number; reason: string; created_at: string }[] })
async function openHistory(variantId: string, label: string) {
  history.open = true
  history.title = label
  history.loading = true
  history.rows = []
  try {
    history.rows = await listMovements(variantId)
  } catch (e) {
    toast.add({ title: t('studio.stock.toast.historyError'), description: getFetchMessage(e), color: 'error' })
  } finally {
    history.loading = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.stock.label')" :title="$t('studio.stock.title')" :description="$t('studio.stock.description')" />

    <!-- сводные метрики -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
      <UiStatCard :label="$t('studio.stock.stats.total')" :value="stock?.length ?? 0" icon="i-lucide-boxes" />
      <UiStatCard :label="$t('studio.stock.stats.low')" :value="lowCount" icon="i-lucide-triangle-alert" :accent="lowCount > 0" :hint="$t('studio.stock.stats.lowHint', { n: LOW_THRESHOLD })" />
      <UiStatCard :label="$t('studio.stock.stats.zero')" :value="zeroCount" icon="i-lucide-package-x" />
    </div>

    <!-- поиск + фильтр низкого остатка -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="q" icon="i-lucide-search" :placeholder="$t('studio.stock.filters.search')" class="w-full sm:w-72" />
      <UCheckbox v-model="onlyLow" :label="$t('studio.stock.filters.onlyLow')" />
    </div>

    <div v-if="pending" class="space-y-2">
      <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-md" class="h-10" />
    </div>
    <UiPanel v-else :padded="false">
      <div class="overflow-x-auto p-2">
        <table class="w-full text-caption">
          <thead class="text-ink-gray-500 ink-label">
            <tr class="border-b border-ink-gray-200">
              <th class="text-left p-3">{{ $t('studio.stock.table.product') }}</th><th class="text-left">{{ $t('studio.stock.table.colorSize') }}</th><th class="text-left">{{ $t('studio.stock.table.sku') }}</th>
              <th class="text-right">{{ $t('studio.stock.table.stock') }}</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in filtered" :key="v.id" class="border-b border-ink-gray-200/60 last:border-0">
              <td class="py-2">{{ v.products?.title }}</td>
              <td>
                <span class="inline-flex items-center gap-1">
                  <span class="size-3 rounded-full border" :style="{ backgroundColor: v.color_hex }" />
                  {{ v.color_name }} / {{ v.size }}
                </span>
              </td>
              <td class="font-mono text-ink-gray-500">{{ v.sku }}</td>
              <td class="text-right font-semibold" :class="low(v.stock) ? 'text-ink-error' : ''">{{ v.stock }}</td>
              <td class="text-right whitespace-nowrap">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-history" @click="openHistory(v.id, `${v.products?.title} · ${v.color_name}/${v.size}`)">{{ $t('studio.stock.history') }}</UButton>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-triangle-alert" :disabled="v.stock < 1" @click="openDefect(v)">{{ $t('studio.stock.defect') }}</UButton>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="5" class="py-6 text-center text-ink-gray-400">{{ $t('studio.stock.emptyFiltered') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiPanel>

    <!-- списание брака: выбор количества -->
    <UModal v-model:open="defect.open" :title="$t('studio.stock.defectTitle')">
      <template #body>
        <div class="space-y-4">
          <p class="text-caption text-ink-gray-600">{{ defect.label }}</p>
          <UFormField :label="$t('studio.stock.defectQty')" :hint="$t('studio.stock.defectMax', { n: defect.max })">
            <UInput v-model.number="defect.qty" type="number" :min="1" :max="defect.max" class="w-full" />
          </UFormField>
          <UButton color="error" block :loading="defect.busy" :disabled="defect.max < 1" @click="confirmDefect">{{ $t('studio.stock.defectConfirm') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- история движений склада -->
    <UModal v-model:open="history.open" :title="$t('studio.stock.historyTitle', { title: history.title })">
      <template #body>
        <div v-if="history.loading" class="py-6 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>
        <div v-else-if="!history.rows.length" class="py-6 text-center text-ink-gray-600 text-caption">{{ $t('studio.stock.historyEmpty') }}</div>
        <table v-else class="w-full text-caption">
          <tbody>
            <tr v-for="m in history.rows" :key="m.id" class="border-b border-ink-gray-200/60">
              <td class="py-2 text-ink-gray-500">{{ dateTime(m.created_at) }}</td>
              <td>{{ REASON_LABELS[m.reason] ?? m.reason }}</td>
              <td class="text-right font-semibold" :class="m.delta > 0 ? 'text-ink-success' : 'text-ink-error'">{{ m.delta > 0 ? '+' : '' }}{{ m.delta }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </UModal>
  </div>
</template>
