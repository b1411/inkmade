<script setup lang="ts">
// Настройки магазина (Фаза B3): публичность витрины и закрытый режим по коду доступа.
// slug/статус/доля меняет только админ (guard-триггер) — здесь недоступны.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.settings.headTitle') })

const { getMine, update } = useMyShop()
const toast = useToast()

const { data: shop } = await useAsyncData('my-shop', () => getMine())

const isPublic = ref(true)
const closed = ref(false)
const accessCode = ref('')

watchEffect(() => {
  const s = shop.value
  if (!s) return
  isPublic.value = s.is_public
  closed.value = !!s.access_code
  accessCode.value = s.access_code ?? ''
})

const saving = ref(false)
async function save() {
  if (!shop.value) return
  if (closed.value && !accessCode.value.trim()) { toast.add({ title: t('shopAdmin.settings.codeRequired'), color: 'warning' }); return }
  saving.value = true
  try {
    await update(shop.value.id, {
      is_public: isPublic.value,
      access_code: closed.value ? accessCode.value.trim() : null,
    })
    toast.add({ title: t('shopAdmin.settings.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('shopAdmin.settings.error'), description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.settings.label')" :title="$t('shopAdmin.settings.title')" />

    <div class="max-w-xl space-y-6">
      <UiPanel :title="$t('shopAdmin.settings.visibility')" icon="i-lucide-eye">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">{{ $t('shopAdmin.settings.publicLabel') }}</p>
              <p class="text-caption text-ink-gray-500">{{ $t('shopAdmin.settings.publicHint') }}</p>
            </div>
            <USwitch v-model="isPublic" />
          </div>
        </div>
      </UiPanel>

      <UiPanel :title="$t('shopAdmin.settings.closedMode')" icon="i-lucide-lock">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">{{ $t('shopAdmin.settings.closedLabel') }}</p>
              <p class="text-caption text-ink-gray-500">{{ $t('shopAdmin.settings.closedHint') }}</p>
            </div>
            <USwitch v-model="closed" />
          </div>
          <UFormField v-if="closed" :label="$t('shopAdmin.settings.code')">
            <UInput v-model="accessCode" :placeholder="$t('shopAdmin.settings.codePlaceholder')" class="w-full" />
          </UFormField>
        </div>
      </UiPanel>

      <UButton color="primary" size="lg" :loading="saving" icon="i-lucide-check" @click="save">{{ $t('shopAdmin.settings.save') }}</UButton>
    </div>
  </div>
</template>
