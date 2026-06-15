<script setup lang="ts">
// Настройки платформы (CRM §6.12): глобальные параметры в platform_settings.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
import { LEGAL } from '~~/shared/config/legal'
const { get, set } = useSettings()
const toast = useToast()

const { data: initial } = await useAsyncData('admin-settings', async () => ({
  support_email: (await get<string>('contacts.email')) ?? LEGAL.supportEmail,
  delivery_eta: (await get<string>('delivery.eta')) ?? 'Обычно 3–7 дней по Казахстану',
  payout_threshold: (await get<number>('payout.threshold')) ?? 5000,
  tax_mode: (await get<string>('tax.mode')) ?? 'simplified',
  company_details: (await get<string>('company.details')) ?? '',
}))
const form = reactive({ support_email: '', delivery_eta: '', payout_threshold: 5000, tax_mode: 'simplified', company_details: '' })
watchEffect(() => { if (initial.value) Object.assign(form, initial.value) })

const taxItems = [
  { label: 'Упрощёнка (4%)', value: 'simplified' },
  { label: 'ОУР + НДС', value: 'our' },
]
const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await Promise.all([
      set('contacts.email', form.support_email),
      set('delivery.eta', form.delivery_eta),
      set('payout.threshold', form.payout_threshold),
      set('tax.mode', form.tax_mode),
      set('company.details', form.company_details),
    ])
    toast.add({ title: 'Настройки сохранены', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally { saving.value = false }
}
const { public: pub } = useRuntimeConfig()
</script>

<template>
  <div class="max-w-2xl">
    <UiPageHeader label="Платформа" title="Настройки" />

    <div class="space-y-6">
      <UiPanel title="Глобальные параметры">
        <div class="space-y-4">
          <UFormField label="Контактный email"><UInput v-model="form.support_email" type="email" class="w-full" /></UFormField>
          <UFormField label="Сроки доставки (текст)"><UInput v-model="form.delivery_eta" class="w-full" /></UFormField>
          <UFormField label="Порог выплаты дизайнерам, ₸"><UInput v-model.number="form.payout_threshold" type="number" class="w-40" /></UFormField>
          <UFormField label="Налоговый режим">
            <USelect v-model="form.tax_mode" :items="taxItems" value-key="value" class="w-full max-w-xs" />
          </UFormField>
          <UFormField label="Реквизиты компании"><UTextarea v-model="form.company_details" :rows="3" class="w-full" /></UFormField>
          <UButton color="primary" :loading="saving" @click="save">Сохранить</UButton>
        </div>
      </UiPanel>

      <UiPanel title="Платежи и валюта">
        <div class="text-caption text-ink-gray-500 space-y-1">
          <p>Валюта: <span class="font-semibold">KZT</span> · Сайт: <span class="font-mono">{{ pub.siteUrl }}</span></p>
          <p>Платёжный провайдер и фискализация (ОФД РК) подключаются на запуске продаж.</p>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
