<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { listStockWithCost, addMovement, listMovements } = useStock()
const { setVariantCost } = useAdmin()
const toast = useToast()

const { data: rows, refresh, pending } = await useAsyncData('admin-stock', () => listStockWithCost())

// инлайн-правка себестоимости заготовки (для маржи/cogs, §6.2)
const costEdit = reactive<Record<string, number>>({})
const costSaving = ref<string | null>(null)
async function saveCost(variantId: string) {
  const value = Number(costEdit[variantId])
  if (Number.isNaN(value) || value < 0) { toast.add({ title: 'Некорректная себестоимость', color: 'warning' }); return }
  costSaving.value = variantId
  try {
    await setVariantCost(variantId, value)
    toast.add({ title: 'Себестоимость сохранена', color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    costSaving.value = null
  }
}

const LOW_THRESHOLD = 5

const reasonItems = [
  { label: 'Приход (закуп)', value: 'purchase' },
  { label: 'Коррекция', value: 'correction' },
  { label: 'Брак', value: 'defect' },
]

const form = reactive({ variantId: '', delta: 1, reason: 'purchase' as 'purchase' | 'correction' | 'defect' })
const saving = ref(false)

async function onSubmit() {
  if (!form.variantId) { toast.add({ title: 'Выберите вариант', color: 'warning' }); return }
  saving.value = true
  try {
    await addMovement(form.variantId, form.delta, form.reason)
    toast.add({ title: 'Движение записано', color: 'success' })
    form.delta = 1
    refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
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
const REASON_LABELS: Record<string, string> = { purchase: 'Приход', correction: 'Коррекция', defect: 'Брак', order: 'Заказ' }
const history = reactive({ open: false, title: '', loading: false, rows: [] as { id: string; delta: number; reason: string; created_at: string }[] })
async function openHistory(variantId: string, label: string) {
  history.open = true
  history.title = label
  history.loading = true
  history.rows = []
  try {
    history.rows = await listMovements(variantId)
  } catch (e) {
    toast.add({ title: 'Не удалось загрузить историю', description: (e as Error).message, color: 'error' })
  } finally {
    history.loading = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>Склад</UiSectionLabel>
    <h1 class="ink-display text-2xl mt-2 mb-6">Заготовки</h1>

    <div class="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
        <div v-else-if="!rows?.length" class="py-10 text-center text-ink-gray-600">
          Вариантов нет. Создайте товар с вариантами.
        </div>
        <table v-else class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="py-2 pr-4">Товар</th>
              <th class="py-2 pr-4">Вариант</th>
              <th class="py-2 pr-4">SKU</th>
              <th class="py-2 pr-4">Себестоимость, ₸</th>
              <th class="py-2 text-right">Остаток</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" class="border-b border-ink-gray-200">
              <td class="py-3 pr-4">{{ r.products?.title }}</td>
              <td class="py-3 pr-4">
                <span class="inline-flex items-center gap-2">
                  <span class="size-3 rounded-full border" :style="{ backgroundColor: r.color_hex }" />
                  {{ r.color_name }} / {{ r.size }}
                </span>
              </td>
              <td class="py-3 pr-4 ink-label text-ink-gray-400">{{ r.sku }}</td>
              <td class="py-3 pr-4">
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
              <td class="py-3 text-right whitespace-nowrap">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-history" class="mr-1" @click="openHistory(r.id, `${r.products?.title} · ${r.color_name}/${r.size}`)" />
                <UBadge :color="r.stock <= LOW_THRESHOLD ? 'warning' : 'neutral'" variant="subtle">{{ r.stock }}</UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside class="border border-ink-gray-200 rounded-lg p-5 h-fit space-y-4">
        <UiSectionLabel accent>Движение склада</UiSectionLabel>
        <UFormField label="Вариант">
          <USelect v-model="form.variantId" :items="variantItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Причина">
          <USelect v-model="form.reason" :items="reasonItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Δ (приход +, расход −)">
          <UInput v-model.number="form.delta" type="number" class="w-full" />
        </UFormField>
        <UButton color="primary" block :loading="saving" @click="onSubmit">Записать</UButton>
      </aside>
    </div>

    <!-- история движений склада -->
    <UModal v-model:open="history.open" :title="`История: ${history.title}`">
      <template #body>
        <div v-if="history.loading" class="py-6 text-center text-ink-gray-600">Загрузка…</div>
        <div v-else-if="!history.rows.length" class="py-6 text-center text-ink-gray-600 text-caption">Движений нет.</div>
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
