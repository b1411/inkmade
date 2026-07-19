<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Профиль клиента (CRM §3.1): просмотр + правка имени/телефона + смена пароля.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { profile, user, fetchProfile, signOut } = useAuth()
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
    toast.add({ title: t('account.overview.errorTitle'), description: getFetchMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

// уведомления (Фаза C4): маркетинговое согласие; транзакционные письма всегда включены.
// marketing_consent нет в кэше useAuth (fetchProfile его не тянет) — грузим отдельно.
const marketing = ref(false)
const marketingPending = ref(true)
const marketingError = ref(false)
const savingNotif = ref(false)
const avatarUrl = ref<string | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
async function loadNotifications() {
  if (!user.value) {
    marketingPending.value = false
    return
  }
  marketingPending.value = true
  marketingError.value = false
  try {
    const { data, error } = await supabase.from('profiles').select('marketing_consent, avatar_url').eq('id', user.value.id).single()
    if (error) throw error
    marketing.value = !!data.marketing_consent
    avatarUrl.value = data.avatar_url ?? null
  } catch {
    marketingError.value = true
  } finally {
    marketingPending.value = false
  }
}
onMounted(loadNotifications)

// загрузка аватара (Фаза C4): публичный бакет design-uploads, путь avatars/<uid>/…
// MIME по факту-allowlist бакета design-uploads (миграция 0040): png/jpeg/webp/gif/avif.
const AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
async function onAvatarPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !user.value) return
  if (!AVATAR_MIME.includes(file.type)) { toast.add({ title: t('account.overview.avatar.typeError'), color: 'warning' }); return }
  uploadingAvatar.value = true
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${user.value.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('design-uploads').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) throw upErr
    const url = supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.value.id)
    if (error) throw error
    avatarUrl.value = url
    toast.add({ title: t('account.overview.avatar.updated'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('account.overview.errorTitle'), description: getFetchMessage(err), color: 'error' })
  } finally {
    uploadingAvatar.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}
async function saveNotifications() {
  if (!user.value || marketingPending.value || marketingError.value) return
  savingNotif.value = true
  try {
    const { error } = await supabase.from('profiles').update({ marketing_consent: marketing.value }).eq('id', user.value.id)
    if (error) throw error
    toast.add({ title: t('account.overview.notif.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('account.overview.errorTitle'), description: getFetchMessage(e), color: 'error' })
  } finally {
    savingNotif.value = false
  }
}

// удаление аккаунта (Фаза C4): анонимизация + бан на сервере, затем выход.
const del = reactive({ open: false, busy: false })
async function deleteAccount() {
  del.busy = true
  try {
    await $fetch('/api/account/delete', { method: 'POST' })
    await signOut()
    await navigateTo('/')
  } catch (e) {
    toast.add({ title: t('account.overview.errorTitle'), description: getFetchMessage(e), color: 'error' })
    del.busy = false
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
    toast.add({ title: t('account.overview.errorTitle'), description: getFetchMessage(e), color: 'error' })
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
        <form class="space-y-4" @submit.prevent="saveProfile">
          <div class="flex items-center gap-4 border-b border-ink-gray-200 pb-4">
            <UiAvatar :name="form.full_name" :email="user?.email" :src="avatarUrl" size="lg" />
            <div class="min-w-0 flex-1">
              <p class="ink-display text-h3 truncate">{{ form.full_name || user?.email }}</p>
              <p v-if="form.full_name" class="text-caption text-ink-gray-600 truncate">{{ user?.email }}</p>
            </div>
            <input ref="avatarInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" class="hidden" @change="onAvatarPick">
            <UButton type="button" size="xs" color="neutral" variant="subtle" icon="i-lucide-camera" :loading="uploadingAvatar" @click="avatarInput?.click()">{{ $t('account.overview.avatar.upload') }}</UButton>
          </div>
          <UFormField :label="$t('account.overview.email')">
            <UInput :model-value="user?.email" disabled class="w-full" />
          </UFormField>
          <UFormField :label="$t('account.overview.fullName')">
            <UInput v-model="form.full_name" class="w-full" />
          </UFormField>
          <UFormField :label="$t('account.overview.phone')">
            <UInput v-model="form.phone" type="tel" :placeholder="$t('account.overview.phonePlaceholder')" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" size="lg" :loading="saving">{{ $t('account.overview.save') }}</UButton>
        </form>
      </UiPanel>

      <UiPanel :title="$t('account.overview.passwordTitle')" icon="i-lucide-lock" :subtitle="$t('account.overview.passwordSubtitle')">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="changePassword">
          <UFormField :label="$t('account.overview.newPassword')" class="flex-1 min-w-56">
            <UInput v-model="pwd.value" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UButton type="submit" color="neutral" variant="subtle" size="lg" :loading="changingPwd">{{ $t('account.overview.changePassword') }}</UButton>
        </form>
      </UiPanel>

      <!-- уведомления (Фаза C4) -->
      <UiPanel :title="$t('account.overview.notif.title')" icon="i-lucide-bell" :subtitle="$t('account.overview.notif.subtitle')">
        <UiSkeleton v-if="marketingPending" rounded="rounded-lg" class="h-24" />
        <UiEmptyState v-else-if="marketingError" compact icon="i-lucide-cloud-off" :title="$t('account.overview.notif.loadError')">
          <UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="loadNotifications">{{ $t('states.retry') }}</UButton>
        </UiEmptyState>
        <form v-else class="space-y-3" @submit.prevent="saveNotifications">
          <UCheckbox v-model="marketing" :label="$t('account.overview.notif.marketing')" />
          <p class="text-caption text-ink-gray-500">{{ $t('account.overview.notif.transactional') }}</p>
          <UButton type="submit" color="neutral" variant="subtle" :loading="savingNotif">{{ $t('account.overview.save') }}</UButton>
        </form>
      </UiPanel>

      <!-- удаление аккаунта (Фаза C4) -->
      <UiPanel :title="$t('account.overview.danger.title')" icon="i-lucide-triangle-alert">
        <div class="space-y-3">
          <p class="text-caption text-ink-gray-600">{{ $t('account.overview.danger.text') }}</p>
          <UButton color="error" variant="subtle" icon="i-lucide-trash-2" @click="del.open = true">{{ $t('account.overview.danger.deleteBtn') }}</UButton>
        </div>
      </UiPanel>
    </div>

    <UModal v-model:open="del.open" :title="$t('account.overview.danger.confirmTitle')">
      <template #body>
        <div class="space-y-4">
          <p class="text-ink-gray-600">{{ $t('account.overview.danger.confirmText') }}</p>
          <div class="flex gap-3 justify-end">
            <UButton color="neutral" variant="ghost" @click="del.open = false">{{ $t('actions.cancel') }}</UButton>
            <UButton color="error" :loading="del.busy" @click="deleteAccount">{{ $t('account.overview.danger.confirmBtn') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
