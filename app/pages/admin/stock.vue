<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { t } = useI18n()
const { listStockWithCost, addMovement, listMovements } = useStock()
const { setVariantCost } = useAdmin()
const toast = useToast()

const { data: rows, refresh, pending } = await useAsyncData('admin-stock', () => listStockWithCost())

// инлайн-правка себестоимости заготовки (для маржи/cogs, §6.2)
const costEdit = reactive<Record<string, number>>({})
const costSaving = ref<string | null>(null)
async function saveCost(variantId: string) {
  const value = Number(costEdit[variantId])
  if (Number.isNaN(value) || value < 0) { toast.add({ title: t('admin.stock.invalidCost'), color: 'warning' }); return }
  costSaving.value = variantId
  try {
    await setVariantCost(variantId, value)
    toast.add({ title: t('admin.stock.costSaved'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.stock.error'), description: (e as Error).message, color: 'error' })
  } finally {
    costSaving.value = null
  }
}

const LOW_THRESHOLD = 5

const reasonItems = computed(() => [
  { label: t('admin.stock.reasonPurchase'), value: 'purchase' },
  { label: t('admin.stock.reasonCorrection'), value: 'correction' },
  { label: t('admin.stock.reasonDefect'), value: 'defect' },
])

const form = reactive({ variantId: '', delta: 1, reason: 'purchase' as 'purchase' | 'correction' | 'defect' })
const saving = ref(false)

async function onSubmit() {
  if (!form.variantId) { toast.add({ title: t('admin.stock.selectVariant'), color: 'warning' }); return }
  saving.value = true
  try {
    await addMovement(form.variantId, form.delta, form.reason)
    toast.add({ title: t('admin.stock.movementRecorded'), color: 'success' })
    form.delta = 1
    refresh()
  } catch (e) {
    toast.add({ title: t('admin.stock.error'), description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const variantItems = computed(() =>
  (rows.value ?? []).map(r => ({
    label: `${r.products?.title} · ${r.color_name}/${r.size} (${r.sku})`,
    value: r.id,
  })),
)

// история движений по варианту (§6.6)
const REASON_LABELS = computed<Record<string, string>>(() => ({
  purchase: t('admin.stock.reasonPurchaseShort'),
  correction: t('admin.stock.reasonCorrectionShort'),
  defect: t('admin.stock.reasonDefectShort'),
  order: t('admin.stock.reasonOrderShort'),
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
    toast.add({ title: t('admin.stock.historyLoadError'), description: (e as Error).message, color: 'error' })
  } finally {
    history.loading = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.stock.label')" :title="$t('admin.stock.title')" :description="$t('admin.stock.description')" />

    <div class="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div v-if="pending" class="space-y-2">
          <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="h-12" />
        </div>
        <UiEmptyState
          v-else-if="!rows?.length"
          icon="i-lucide-package"
          :title="$t('admin.stock.emptyTitle')"
          :text="$t('admin.stock.emptyText')"
        />
        <UiPanel v-else :padded="false">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                  <th class="px-6 py-3">{{ $t('admin.stock.colProduct') }}</th>
                  <th class="px-6 py-3">{{ $t('admin.stock.colVariant') }}</th>
                  <th class="px-6 py-3">{{ $t('admin.stock.colSku') }}</th>
                  <th class="px-6 py-3">{{ $t('admin.stock.colCost') }}</th>
                  <th class="px-6 py-3 text-right">{{ $t('admin.stock.colStock') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id" class="border-b border-ink-gray-200">
                  <td class="px-6 py-3">{{ r.products?.title }}</td>
                  <td class="px-6 py-3">
                    <span class="inline-flex items-center gap-2">
                      <span class="size-3 rounded-full border" :style="{ backgroundColor: r.color_hex }" />
                      {{ r.color_name }} / {{ r.size }}
                    </span>
                  </td>
                  <td class="px-6 py-3 ink-label text-ink-gray-400">{{ r.sku }}</td>
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-1">
                      <UInput
                        v-model.number="costEdit[r.id]"
                        type="number" size="xs" class="w-24"
                        :placeholder="String(r.blank_cost ?? 0)"
                      />
                      <UButton
                        size="xs" color="neutral" variant="subtle" icon="i-lucide-check"
                        :loading="costSaving === r.id"
                        :disabled="costEdit[r.id] == null"
                        @click="saveCost(r.id)"
                      />
                    </div>
                  </td>
                  <td class="px-6 py-3 text-right whitespace-nowrap">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-history" class="mr-1" @click="openHistory(r.id, `${r.products?.title} · ${r.color_name}/${r.size}`)" />
                    <UBadge :color="r.stock <= LOW_THRESHOLD ? 'warning' : 'neutral'" variant="subtle">{{ r.stock }}</UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiPanel>
      </div>

      <UiPanel :title="$t('admin.stock.movementTitle')" class="h-fit">
        <div class="space-y-4">
          <UFormField :label="$t('admin.stock.fieldVariant')">
            <USelect v-model="form.variantId" :items="variantItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.stock.fieldReason')">
            <USelect v-model="form.reason" :items="reasonItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.stock.fieldDelta')">
            <UInput v-model.number="form.delta" type="number" class="w-full" />
          </UFormField>
          <UButton color="primary" block :loading="saving" @click="onSubmit">{{ $t('admin.stock.record') }}</UButton>
        </div>
      </UiPanel>
    </div>

    <!-- история движений склада -->
    <UModal v-model:open="history.open" :title="$t('admin.stock.historyTitle', { title: history.title })">
      <template #body>
        <div v-if="history.loading" class="space-y-2">
          <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-8" />
        </div>
        <UiEmptyState v-else-if="!history.rows.length" icon="i-lucide-history" :title="$t('admin.stock.historyEmpty')" />
        <table v-else class="w-full text-caption">
          <tbody>
            <tr v-for="m in history.rows" :key="m.id" class="border-b border-ink-gray-200/60">
              <td class="py-2 text-ink-gray-500">{{ new Date(m.created_at).toLocaleString('ru') }}</td>
              <td>{{ REASON_LABELS[m.reason] ?? m.reason }}</td><!-- REASON_LABELS — computed -->
              <td class="text-right font-semibold" :class="m.delta > 0 ? 'text-ink-success' : 'text-ink-error'">{{ m.delta > 0 ? '+' : '' }}{{ m.delta }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </UModal>
  </div>
</template>
