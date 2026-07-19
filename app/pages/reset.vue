<script setup lang="ts">
// Установка нового пароля по ссылке из письма (§9.1). Ссылка из resetPasswordForEmail
// приводит сюда и устанавливает recovery-сессию (supabase-js detectSessionInUrl →
// событие PASSWORD_RECOVERY). По этой сессии вызываем updateUser({ password }).
// Если валидной сессии нет (прямой заход/протухшая ссылка) — просим запросить новую.
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('auth.reset.label')} — INKMADE` })

const { updatePassword } = useAuth()
const supabase = useSupabaseClient()
const toast = useToast()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)
const ready = ref(false) // есть активная (recovery) сессия → форма доступна
const checking = ref(true) // ещё выясняем наличие сессии

let unsub: (() => void) | null = null

onMounted(async () => {
  // Сессия из URL-хэша обычно уже разобрана к моменту mount — проверяем getSession,
  // плюс слушаем событие на случай, если разбор придёт чуть позже.
  const { data } = await supabase.auth.getSession()
  if (data.session) ready.value = true
  checking.value = false
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
      ready.value = true
      checking.value = false
    }
  })
  unsub = () => listener.subscription.unsubscribe()
})

onUnmounted(() => unsub?.())

async function onSubmit() {
  if (loading.value) return // защита от двойного сабмита
  if (password.value.length < 6) {
    toast.add({ title: t('auth.reset.shortTitle'), description: t('auth.reset.shortDescription'), color: 'warning' })
    return
  }
  if (password.value !== confirm.value) {
    toast.add({ title: t('auth.reset.mismatchTitle'), color: 'warning' })
    return
  }
  loading.value = true
  try {
    await updatePassword(password.value)
    toast.add({ title: t('auth.reset.successTitle'), color: 'success' })
    await navigateTo('/account')
  } catch (e) {
    toast.add({ title: t('auth.reset.errorTitle'), description: t(authErrorKey(e)), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>{{ $t('auth.reset.label') }}</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2">{{ $t('auth.reset.title') }}</h1>
    <p class="text-ink-gray-600 mt-2 mb-8">{{ $t('auth.reset.subtitle') }}</p>

    <!-- выясняем сессию -->
    <div v-if="checking" class="flex justify-center py-6">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-ink-burgundy" />
    </div>

    <!-- нет валидной recovery-сессии -->
    <UAlert
      v-else-if="!ready"
      color="warning"
      icon="i-lucide-triangle-alert"
      :title="$t('auth.reset.invalidTitle')"
      :description="$t('auth.reset.invalidDescription')"
      :actions="[{ label: $t('auth.reset.requestNew'), color: 'warning', variant: 'soft', to: '/forgot' }]"
    />

    <!-- форма нового пароля -->
    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <UFormField :label="$t('auth.reset.passwordLabel')">
        <UInput v-model="password" :type="showPassword ? 'text' : 'password'" size="lg" autocomplete="new-password" icon="i-lucide-lock" required class="w-full" :ui="{ trailing: 'pointer-events-auto' }">
          <template #trailing>
            <button type="button" class="text-ink-gray-500 hover:text-ink-black" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword = !showPassword">
              <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
            </button>
          </template>
        </UInput>
      </UFormField>
      <UFormField :label="$t('auth.reset.passwordConfirmLabel')">
        <UInput v-model="confirm" :type="showConfirm ? 'text' : 'password'" size="lg" autocomplete="new-password" icon="i-lucide-lock" required class="w-full" :ui="{ trailing: 'pointer-events-auto' }">
          <template #trailing>
            <button type="button" class="text-ink-gray-500 hover:text-ink-black" :aria-label="showConfirm ? 'Скрыть пароль' : 'Показать пароль'" @click="showConfirm = !showConfirm">
              <UIcon :name="showConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
            </button>
          </template>
        </UInput>
      </UFormField>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" trailing-icon="i-lucide-check">{{ $t('auth.reset.submit') }}</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-8 text-center">
      <NuxtLink to="/login" class="text-ink-burgundy font-semibold">{{ $t('auth.forgot.backToLogin') }}</NuxtLink>
    </p>
  </div>
</template>
