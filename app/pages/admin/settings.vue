<script setup lang="ts">
// Настройки платформы (CRM §6.12): глобальные параметры в platform_settings.
import { LEGAL } from '~~/shared/config/legal'
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const { get, set } = useSettings()
const toast = useToast()

const { data: initial } = await useAsyncData('admin-settings', async () => ({
  support_email: (await get<string>('contacts.email')) ?? LEGAL.supportEmail,
  delivery_eta: (await get<string>('delivery.eta')) ?? t('admin.settings.deliveryEtaDefault'),
  payout_threshold: (await get<number>('payout.threshold')) ?? 5000,
  tax_mode: (await get<string>('tax.mode')) ?? 'simplified',
  company_details: (await get<string>('company.details')) ?? '',
}))
const form = reactive({ support_email: '', delivery_eta: '', payout_threshold: 5000, tax_mode: 'simplified', company_details: '' })
watchEffect(() => { if (initial.value) Object.assign(form, initial.value) })

const taxItems = computed(() => [
  { label: t('admin.settings.tax.simplified'), value: 'simplified' },
  { label: t('admin.settings.tax.our'), value: 'our' },
])
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
    toast.add({ title: t('admin.settings.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.settings.error'), description: getFetchMessage(e), color: 'error' })
  } finally { saving.value = false }
}
const { public: pub } = useRuntimeConfig()
</script>

<template>
  <div class="max-w-2xl">
    <UiPageHeader :label="$t('admin.settings.label')" :title="$t('admin.settings.title')" />

    <div class="space-y-6">
      <UiPanel :title="$t('admin.settings.globalParams')">
        <div class="space-y-4">
          <UFormField :label="$t('admin.settings.form.supportEmail')"><UInput v-model="form.support_email" type="email" class="w-full" /></UFormField>
          <UFormField :label="$t('admin.settings.form.deliveryEta')"><UInput v-model="form.delivery_eta" class="w-full" /></UFormField>
          <UFormField :label="$t('admin.settings.form.payoutThreshold')"><UInput v-model.number="form.payout_threshold" type="number" class="w-40" /></UFormField>
          <UFormField :label="$t('admin.settings.form.taxMode')">
            <USelect v-model="form.tax_mode" :items="taxItems" value-key="value" class="w-full max-w-xs" />
          </UFormField>
          <UFormField :label="$t('admin.settings.form.companyDetails')"><UTextarea v-model="form.company_details" :rows="3" class="w-full" /></UFormField>
          <UButton color="primary" :loading="saving" @click="save">{{ $t('actions.save') }}</UButton>
        </div>
      </UiPanel>

      <UiPanel :title="$t('admin.settings.payments.title')">
        <div class="text-caption text-ink-gray-500 space-y-1">
          <p>{{ $t('admin.settings.payments.currency') }} <span class="font-semibold">KZT</span> · {{ $t('admin.settings.payments.site') }} <span class="font-mono">{{ pub.siteUrl }}</span></p>
          <p>{{ $t('admin.settings.payments.providerNote') }}</p>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
