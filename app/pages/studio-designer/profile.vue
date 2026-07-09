<script setup lang="ts">
// Профиль дизайнера (CRM §4.4, §4.5): витрина + налоговый статус + реквизиты.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()
const toast = useToast()
const { t } = useI18n()

const { data: profile, refresh } = await useAsyncData('designer-profile', () => d.profile())

const form = reactive({
  display_name: '', bio: '', is_public: false, tax_status: 'individual',
  payout_bank: '', payout_account: '',
})
watchEffect(() => {
  if (!profile.value) return
  form.display_name = profile.value.display_name ?? ''
  form.bio = profile.value.bio ?? ''
  form.is_public = profile.value.is_public
  form.tax_status = profile.value.tax_status
  const pd = (profile.value.payout_details ?? {}) as { bank?: string; account?: string }
  form.payout_bank = pd.bank ?? ''
  form.payout_account = pd.account ?? ''
})

const taxItems = computed(() => [
  { label: t('studio.designer.profile.tax.individual'), value: 'individual' },
  { label: t('studio.designer.profile.tax.selfEmployed'), value: 'self_employed' },
  { label: t('studio.designer.profile.tax.ip'), value: 'ip' },
])

// аватар: загрузка → URL → сохранение в профиль
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
async function onAvatarPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !profile.value) return
  avatarUploading.value = true
  try {
    const url = await d.uploadAvatar(file)
    await d.updateProfile({ avatar_url: url })
    await refresh()
    toast.add({ title: t('studio.designer.profile.toast.avatarUpdated'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('studio.designer.profile.toast.uploadError'), description: getFetchMessage(err), color: 'error' })
  } finally {
    avatarUploading.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

const saving = ref(false)
async function save() {
  if (!profile.value) { toast.add({ title: t('studio.designer.profile.toast.notActivated'), color: 'warning' }); return }
  saving.value = true
  try {
    await d.updateProfile({
      display_name: form.display_name, bio: form.bio, is_public: form.is_public, tax_status: form.tax_status,
      payout_details: { bank: form.payout_bank, account: form.payout_account },
    })
    await refresh()
    toast.add({ title: t('studio.designer.profile.toast.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('studio.designer.profile.toast.error'), description: getFetchMessage(e), color: 'error' })
  } finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-lg">
    <UiPageHeader :label="$t('studio.designer.profile.label')" :title="$t('studio.designer.profile.title')" :description="$t('studio.designer.profile.description')" />

    <div v-if="!profile" class="border border-ink-warning/40 bg-ink-warning/5 rounded-lg p-4 text-caption">
      {{ $t('studio.designer.profile.notActivated') }}
    </div>

    <div v-else class="space-y-6">
      <UiPanel :title="$t('studio.designer.profile.showcase')" icon="i-lucide-store">
        <div class="space-y-4">
          <!-- аватар -->
          <div class="flex items-center gap-4">
            <div class="size-16 rounded-full bg-ink-gray-200 overflow-hidden shrink-0">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="$t('studio.designer.profile.avatarAlt')" class="w-full h-full object-cover">
              <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
                <UIcon name="i-lucide-user" class="size-6" />
              </div>
            </div>
            <input ref="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onAvatarPick">
            <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-image-plus" :loading="avatarUploading" @click="avatarInput?.click()">
              {{ $t('studio.designer.profile.uploadAvatar') }}
            </UButton>
          </div>

          <UFormField :label="$t('studio.designer.profile.displayName')"><UInput v-model="form.display_name" class="w-full" /></UFormField>
          <UFormField :label="$t('studio.designer.profile.bio')"><UTextarea v-model="form.bio" :rows="3" class="w-full" /></UFormField>
          <UCheckbox v-model="form.is_public" :label="$t('studio.designer.profile.isPublic')" />
          <NuxtLink
            v-if="profile?.is_public"
            :to="`/designer/${profile.id}`" target="_blank"
            class="inline-flex items-center gap-1 text-caption text-ink-burgundy font-semibold"
          >
            <UIcon name="i-lucide-external-link" class="size-3" /> {{ $t('studio.designer.profile.openShowcase') }}
          </NuxtLink>
        </div>
      </UiPanel>

      <UiPanel :title="$t('studio.designer.profile.payoutDetails')" icon="i-lucide-credit-card">
        <div class="space-y-4">
          <UFormField :label="$t('studio.designer.profile.taxStatus')">
            <USelect v-model="form.tax_status" :items="taxItems" value-key="value" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('studio.designer.profile.bank')"><UInput v-model="form.payout_bank" class="w-full" /></UFormField>
            <UFormField :label="$t('studio.designer.profile.account')"><UInput v-model="form.payout_account" class="w-full" /></UFormField>
          </div>
        </div>
      </UiPanel>

      <div class="flex items-center justify-between gap-4">
        <UButton color="primary" size="lg" :loading="saving" @click="save">{{ $t('studio.designer.profile.save') }}</UButton>
        <p class="text-caption text-ink-gray-400">{{ $t('studio.designer.profile.offerNote') }}</p>
      </div>
    </div>
  </div>
</template>
