<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Профиль клиента (CRM §3.1): просмотр + правка имени/телефона + смена пароля.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { profile, user, fetchProfile } = useAuth()
const supabase = useSupabaseClient<Database>()
const toast = useToast()
const { t } = useI18n()

const form = reactive({ full_name: profile.value?.full_name ?? '', phone: profile.value?.phone ?? '' })
watchEffect(() => {
  form.full_name = profile.value?.full_name ?? ''
  form.phone = profile.value?.phone ?? ''
})

const saving = ref(false)
async function saveProfile() {
  if (!user.value) return
  saving.value = true
  try {
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', user.value.id)
    if (error) throw error
    await fetchProfile(true)
    toast.add({ title: t('account.overview.savedTitle'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('account.overview.errorTitle'), description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const pwd = reactive({ value: '' })
const changingPwd = ref(false)
async function changePassword() {
  if (pwd.value.length < 6) { toast.add({ title: t('account.overview.passwordTooShortTitle'), description: t('account.overview.passwordTooShortText'), color: 'warning' }); return }
  changingPwd.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: pwd.value })
    if (error) throw error
    pwd.value = ''
    toast.add({ title: t('account.overview.passwordChangedTitle'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('account.overview.errorTitle'), description: (e as Error).message, color: 'error' })
  } finally {
    changingPwd.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <UiPageHeader :label="$t('account.overview.label')" :title="$t('account.overview.title')" :description="$t('account.overview.description')" />

    <div class="space-y-6">
      <UiPanel :title="$t('account.overview.personalData')" icon="i-lucide-user">
        <div class="space-y-4">
          <UFormField :label="$t('account.overview.email')">
            <UInput :model-value="user?.email" disabled class="w-full" />
          </UFormField>
          <UFormField :label="$t('account.overview.fullName')">
            <UInput v-model="form.full_name" class="w-full" />
          </UFormField>
          <UFormField :label="$t('account.overview.phone')">
            <UInput v-model="form.phone" type="tel" :placeholder="$t('account.overview.phonePlaceholder')" class="w-full" />
          </UFormField>
          <UButton color="primary" size="lg" :loading="saving" @click="saveProfile">{{ $t('account.overview.save') }}</UButton>
        </div>
      </UiPanel>

      <UiPanel :title="$t('account.overview.passwordTitle')" icon="i-lucide-lock" :subtitle="$t('account.overview.passwordSubtitle')">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField :label="$t('account.overview.newPassword')" class="flex-1 min-w-56">
            <UInput v-model="pwd.value" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UButton color="neutral" variant="subtle" size="lg" :loading="changingPwd" @click="changePassword">{{ $t('account.overview.changePassword') }}</UButton>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
