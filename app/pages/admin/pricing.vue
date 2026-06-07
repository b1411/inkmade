<script setup lang="ts">
// Ценообразование (CRM §6.7): текущие ставки + надбавки методов (справочно).
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
import { PRICING } from '~~/shared/config/pricing'
import { METHOD_SURCHARGE, PRINT_METHOD_LABELS, type PrintMethod } from '~~/shared/config/print-methods'

const methods = Object.keys(METHOD_SURCHARGE) as PrintMethod[]

// промокоды (§6.7)
const { listPromos, createPromo, togglePromo, deletePromo } = useAdmin()
const toast = useToast()
const { data: promos, refresh } = await useAsyncData('admin-promos', () => listPromos())

const form = reactive({ code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: 10, min_order: 0, max_uses: '' })
const saving = ref(false)
const typeItems = [{ label: 'Процент (%)', value: 'percent' }, { label: 'Фикс (₸)', value: 'fixed' }]

async function addPromo() {
  if (!form.code.trim() || form.discount_value <= 0) { toast.add({ title: 'Заполните код и скидку', color: 'warning' }); return }
  saving.value = true
  try {
    await createPromo({
      code: form.code, discount_type: form.discount_type, discount_value: form.discount_value,
      min_order: form.min_order || 0, max_uses: form.max_uses === '' ? null : Number(form.max_uses),
    })
    Object.assign(form, { code: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '' })
    await refresh()
    toast.add({ title: 'Промокод создан', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally { saving.value = false }
}
async function onToggle(id: string, active: boolean) { await togglePromo(id, active); await refresh() }
async function onDelete(id: string) { await deletePromo(id); await refresh() }
const fmtVal = (p: { discount_type: string; discount_value: number }) =>
  p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} ₸`
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <div>
      <UiSectionLabel accent>Цены</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Ценообразование</h1>
      <p class="text-caption text-ink-gray-600 mt-1">Базовые ставки в <code>shared/config/pricing.ts</code>; изменение — правкой конфига и редеплоем. Промокоды управляются ниже.</p>
    </div>

    <section>
      <UiSectionLabel>Базовые ставки</UiSectionLabel>
      <div class="mt-3 border border-ink-gray-200 rounded-lg divide-y divide-ink-gray-200 text-caption">
        <div class="flex justify-between p-3"><span>Зональная печать (ставка/зона)</span><span class="font-semibold">{{ PRICING.zonalRatePerZone }} ₸</span></div>
        <div class="flex justify-between p-3"><span>Full-print</span><span class="font-semibold">{{ PRICING.fullprintRate }} ₸</span></div>
        <div class="flex justify-between p-3"><span>Текстовый элемент</span><span class="font-semibold">{{ PRICING.textCost }} ₸</span></div>
        <div class="flex justify-between p-3"><span>Мин. коэффициент площади</span><span class="font-semibold">{{ PRICING.minAreaCoef }}</span></div>
      </div>
    </section>

    <section>
      <UiSectionLabel>Надбавка за метод нанесения</UiSectionLabel>
      <div class="mt-3 border border-ink-gray-200 rounded-lg divide-y divide-ink-gray-200 text-caption">
        <div v-for="m in methods" :key="m" class="flex justify-between p-3">
          <span>{{ PRINT_METHOD_LABELS[m] }}</span><span class="font-semibold">+{{ METHOD_SURCHARGE[m] }} ₸</span>
        </div>
      </div>
    </section>

    <section>
      <UiSectionLabel>Промокоды</UiSectionLabel>

      <!-- создание -->
      <div class="mt-3 border border-ink-gray-200 rounded-lg p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <UFormField label="Код"><UInput v-model="form.code" placeholder="SALE10" class="w-full" /></UFormField>
        <UFormField label="Тип"><USelect v-model="form.discount_type" :items="typeItems" value-key="value" class="w-full" /></UFormField>
        <UFormField label="Скидка"><UInput v-model.number="form.discount_value" type="number" class="w-full" /></UFormField>
        <UFormField label="Мин. заказ ₸"><UInput v-model.number="form.min_order" type="number" class="w-full" /></UFormField>
        <UFormField label="Лимит (пусто=∞)"><UInput v-model="form.max_uses" type="number" class="w-full" /></UFormField>
        <UButton color="primary" icon="i-lucide-plus" :loading="saving" class="lg:col-span-5 w-fit" @click="addPromo">Создать промокод</UButton>
      </div>

      <!-- список -->
      <table v-if="promos?.length" class="w-full text-caption mt-4">
        <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
          <th class="text-left py-2">Код</th><th class="text-right">Скидка</th><th class="text-right">Мин.</th>
          <th class="text-right">Исп./лимит</th><th class="text-center pl-3">Активен</th><th></th>
        </tr></thead>
        <tbody>
          <tr v-for="p in promos" :key="p.id" class="border-b border-ink-gray-200/60">
            <td class="py-2 font-mono font-semibold">{{ p.code }}</td>
            <td class="text-right">{{ fmtVal(p) }}</td>
            <td class="text-right">{{ p.min_order }} ₸</td>
            <td class="text-right">{{ p.used_count }}/{{ p.max_uses ?? '∞' }}</td>
            <td class="text-center pl-3">
              <UButton :icon="p.active ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left'" :color="p.active ? 'success' : 'neutral'" variant="ghost" size="xs" @click="onToggle(p.id, !p.active)" />
            </td>
            <td class="text-right"><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(p.id)" /></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-caption text-ink-gray-500 mt-3">Промокодов пока нет.</p>
    </section>
  </div>
</template>
