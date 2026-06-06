<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const { listStock, addMovement } = useStock()
const toast = useToast()

const { data: rows, refresh, pending } = await useAsyncData('admin-stock', () => listStock())

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
              <td class="py-3 text-right">
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
  </div>
</template>
