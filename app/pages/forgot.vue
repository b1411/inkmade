<script setup lang="ts">
// Запрос восстановления пароля (§9.1). Брендовый auth-экран. Отправляет письмо
// со ссылкой на /reset. Анти-энумерация: показываем нейтральный «проверьте почту»
// независимо от того, существует ли аккаунт (поведение Supabase).
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('auth.forgot.label')} — INKMADE` })

const { requestPasswordReset } = useAuth()
const toast = useToast()

const email = ref('')
const loading = ref(false)
const done = ref(false)

async function onSubmit() {
  if (loading.value) return // защита от двойного сабмита
  loading.value = true
  try {
    await requestPasswordReset(email.value)
    done.value = true
  } catch (e) {
    toast.add({ title: t('auth.forgot.errorTitle'), description: getFetchMessage(e), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>{{ $t('auth.forgot.label') }}</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2">{{ $t('auth.forgot.title') }}</h1>
    <p class="text-ink-gray-600 mt-2 mb-8">{{ $t('auth.forgot.subtitle') }}</p>

    <UAlert
      v-if="done"
      color="success"
      icon="i-lucide-mail-check"
      :title="$t('auth.forgot.doneTitle')"
      :description="$t('auth.forgot.doneDescription')"
    />

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <UFormField :label="$t('auth.forgot.emailLabel')">
        <UInput v-model="email" type="email" size="lg" autocomplete="email" icon="i-lucide-mail" required class="w-full" />
      </UFormField>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" trailing-icon="i-lucide-send">{{ $t('auth.forgot.submit') }}</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-8 text-center">
      <NuxtLink to="/login" class="text-ink-burgundy font-semibold">{{ $t('auth.forgot.backToLogin') }}</NuxtLink>
    </p>
  </div>
</template>
