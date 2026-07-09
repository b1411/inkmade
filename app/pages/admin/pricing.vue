<script setup lang="ts">
// Ценообразование (CRM §6.7): текущие ставки + надбавки методов (справочно).
import { PRICING } from '~~/shared/config/pricing'
import { METHOD_SURCHARGE, type PrintMethod } from '~~/shared/config/print-methods'
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const methods = Object.keys(METHOD_SURCHARGE) as PrintMethod[]

// промокоды (§6.7)
const { t } = useI18n()
const { listPromos, createPromo, togglePromo, deletePromo } = useAdmin()
const toast = useToast()
const { data: promos, refresh } = await useAsyncData('admin-promos', () => listPromos())

const form = reactive({ code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: 10, min_order: 0, max_uses: '' })
const saving = ref(false)
const typeItems = computed(() => [{ label: t('admin.pricing.typePercent'), value: 'percent' }, { label: t('admin.pricing.typeFixed'), value: 'fixed' }])

async function addPromo() {
  if (!form.code.trim() || form.discount_value <= 0) { toast.add({ title: t('admin.pricing.validationCodeDiscount'), color: 'warning' }); return }
  saving.value = true
  try {
    await createPromo({
      code: form.code, discount_type: form.discount_type, discount_value: form.discount_value,
      min_order: form.min_order || 0, max_uses: form.max_uses === '' ? null : Number(form.max_uses),
    })
    Object.assign(form, { code: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '' })
    await refresh()
    toast.add({ title: t('admin.pricing.promoCreated'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.pricing.error'), description: getFetchMessage(e), color: 'error' })
  } finally { saving.value = false }
}
async function onToggle(id: string, active: boolean) { await togglePromo(id, active); await refresh() }
async function onDelete(id: string) {
  if (!confirm(t('admin.pricing.deleteConfirm'))) return
  await deletePromo(id); await refresh()
}
const fmtVal = (p: { discount_type: string; discount_value: number }) =>
  p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} ₸`
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <UiPageHeader :label="$t('admin.pricing.label')" :title="$t('admin.pricing.title')" :description="$t('admin.pricing.description')" />

    <UiPanel :title="$t('admin.pricing.baseRatesTitle')" :padded="false">
      <div class="divide-y divide-ink-gray-200 text-caption">
        <div class="flex justify-between px-6 py-3"><span>{{ $t('admin.pricing.zonalRate') }}</span><span class="font-semibold">{{ PRICING.zonalRatePerZone }} {{ $t('units.currency') }}</span></div>
        <div class="flex justify-between px-6 py-3"><span>{{ $t('admin.pricing.fullprint') }}</span><span class="font-semibold">{{ PRICING.fullprintRate }} {{ $t('units.currency') }}</span></div>
        <div class="flex justify-between px-6 py-3"><span>{{ $t('admin.pricing.textElement') }}</span><span class="font-semibold">{{ PRICING.textCost }} {{ $t('units.currency') }}</span></div>
        <div class="flex justify-between px-6 py-3"><span>{{ $t('admin.pricing.minAreaCoef') }}</span><span class="font-semibold">{{ PRICING.minAreaCoef }}</span></div>
      </div>
    </UiPanel>

    <UiPanel :title="$t('admin.pricing.methodSurchargeTitle')" :padded="false">
      <div class="divide-y divide-ink-gray-200 text-caption">
        <div v-for="m in methods" :key="m" class="flex justify-between px-6 py-3">
          <span>{{ $t(`domain.printMethod.${m}`) }}</span><span class="font-semibold">+{{ METHOD_SURCHARGE[m] }} {{ $t('units.currency') }}</span>
        </div>
      </div>
    </UiPanel>

    <UiPanel :title="$t('admin.pricing.promosTitle')">
      <!-- создание -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <UFormField :label="$t('admin.pricing.fieldCode')"><UInput v-model="form.code" :placeholder="$t('admin.pricing.codePlaceholder')" class="w-full" /></UFormField>
        <UFormField :label="$t('admin.pricing.fieldType')"><USelect v-model="form.discount_type" :items="typeItems" value-key="value" class="w-full" /></UFormField>
        <UFormField :label="$t('admin.pricing.fieldDiscount')"><UInput v-model.number="form.discount_value" type="number" class="w-full" /></UFormField>
        <UFormField :label="$t('admin.pricing.fieldMinOrder')"><UInput v-model.number="form.min_order" type="number" class="w-full" /></UFormField>
        <UFormField :label="$t('admin.pricing.fieldLimit')"><UInput v-model="form.max_uses" type="number" class="w-full" /></UFormField>
        <UButton color="primary" icon="i-lucide-plus" :loading="saving" class="lg:col-span-5 w-fit" @click="addPromo">{{ $t('admin.pricing.createPromo') }}</UButton>
      </div>

      <!-- список -->
      <table v-if="promos?.length" class="w-full text-caption mt-6">
        <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
          <th class="text-left py-2">{{ $t('admin.pricing.colCode') }}</th><th class="text-right">{{ $t('admin.pricing.colDiscount') }}</th><th class="text-right">{{ $t('admin.pricing.colMin') }}</th>
          <th class="text-right">{{ $t('admin.pricing.colUsedLimit') }}</th><th class="text-center pl-3">{{ $t('admin.pricing.colActive') }}</th><th></th>
        </tr></thead>
        <tbody>
          <tr v-for="p in promos" :key="p.id" class="border-b border-ink-gray-200/60">
            <td class="py-2 font-mono font-semibold">{{ p.code }}</td>
            <td class="text-right">{{ fmtVal(p) }}</td>
            <td class="text-right">{{ p.min_order }} {{ $t('units.currency') }}</td>
            <td class="text-right">{{ p.used_count }}/{{ p.max_uses ?? '∞' }}</td>
            <td class="text-center pl-3">
              <UButton :icon="p.active ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left'" :color="p.active ? 'success' : 'neutral'" variant="ghost" size="xs" @click="onToggle(p.id, !p.active)" />
            </td>
            <td class="text-right"><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(p.id)" /></td>
          </tr>
        </tbody>
      </table>
      <UiEmptyState v-else icon="i-lucide-ticket" :title="$t('admin.pricing.emptyTitle')" :text="$t('admin.pricing.emptyText')" class="mt-4" />
    </UiPanel>
  </div>
</template>
