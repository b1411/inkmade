<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Профиль клиента (CRM §3.1): просмотр + правка имени/телефона + смена пароля.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { profile, user, fetchProfile } = useAuth()
const supabase = useSupabaseClient<Database>()
const toast = useToast()

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
    toast.add({ title: 'Профиль сохранён', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const pwd = reactive({ value: '' })
const changingPwd = ref(false)
async function changePassword() {
  if (pwd.value.length < 6) { toast.add({ title: 'Пароль слишком короткий', description: 'Минимум 6 символов', color: 'warning' }); return }
  changingPwd.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: pwd.value })
    if (error) throw error
    pwd.value = ''
    toast.add({ title: 'Пароль изменён', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    changingPwd.value = false
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div>
      <UiSectionLabel accent>Профиль</UiSectionLabel>
      <h1 class="ink-display text-3xl mt-2">Личный кабинет</h1>
    </div>

    <UCard>
      <div class="space-y-4">
        <UFormField label="Email">
          <UInput :model-value="user?.email" disabled class="w-full" />
        </UFormField>
        <UFormField label="Имя и фамилия">
          <UInput v-model="form.full_name" class="w-full" />
        </UFormField>
        <UFormField label="Телефон">
          <UInput v-model="form.phone" type="tel" placeholder="+7 700 000 00 00" class="w-full" />
        </UFormField>
        <UButton color="primary" :loading="saving" @click="saveProfile">Сохранить</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header><span class="font-semibold">Смена пароля</span></template>
      <div class="flex items-end gap-2">
        <UFormField label="Новый пароль" class="flex-1">
          <UInput v-model="pwd.value" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UButton color="neutral" variant="subtle" :loading="changingPwd" @click="changePassword">Изменить</UButton>
      </div>
    </UCard>
  </div>
</template>
