<script setup lang="ts">
// Склад заготовок для цеха (CRM §5.1): просмотр остатков + фиксация брака (defect).
// Приход заводит админ; оператор только видит и списывает брак.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })
const { listStock, addMovement, listMovements } = useStock()
const toast = useToast()
const { t } = useI18n()

const { data: stock, refresh, pending } = await useAsyncData('studio-stock', () => listStock())

const busy = ref<string | null>(null)
async function markDefect(variantId: string) {
  busy.value = variantId
  try {
    await addMovement(variantId, -1, 'defect')
    await refresh()
    toast.add({ title: t('studio.stock.toast.defectWrittenOff'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('studio.stock.toast.error'), description: (e as { data?: { message?: string } }).data?.message ?? (e as Error).message, color: 'error' })
  } finally { busy.value = null }
}
const low = (n: number) => n <= 5

// история движений по варианту (CRM §5.1)
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
    toast.add({ title: t('studio.stock.toast.historyError'), description: (e as Error).message, color: 'error' })
  } finally {
    history.loading = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.stock.label')" :title="$t('studio.stock.title')" :description="$t('studio.stock.description')" />
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
        <tr v-for="v in stock" :key="v.id" class="border-b border-ink-gray-200/60 last:border-0">
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
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-triangle-alert" :loading="busy === v.id" @click="markDefect(v.id)">{{ $t('studio.stock.defect') }}</UButton>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
    </UiPanel>

    <!-- история движений склада -->
    <UModal v-model:open="history.open" :title="$t('studio.stock.historyTitle', { title: history.title })">
      <template #body>
        <div v-if="history.loading" class="py-6 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>
        <div v-else-if="!history.rows.length" class="py-6 text-center text-ink-gray-600 text-caption">{{ $t('studio.stock.historyEmpty') }}</div>
        <table v-else class="w-full text-caption">
          <tbody>
            <tr v-for="m in history.rows" :key="m.id" class="border-b border-ink-gray-200/60">
              <td class="py-2 text-ink-gray-500">{{ new Date(m.created_at).toLocaleString('ru') }}</td>
              <td>{{ REASON_LABELS[m.reason] ?? m.reason }}</td>
              <td class="text-right font-semibold" :class="m.delta > 0 ? 'text-ink-success' : 'text-ink-error'">{{ m.delta > 0 ? '+' : '' }}{{ m.delta }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </UModal>
  </div>
</template>
