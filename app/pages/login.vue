<script setup lang="ts">
// Вход (§9.1). Брендовый auth-экран (layout 'auth'). Логин требуется поздно —
// на checkout/шаринге, не на входе в каталог.
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('auth.login.label')} — INKMADE` })

const { signIn } = useAuth()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

// «Зарегистрироваться» обязан унести ?redirect дальше — иначе цель входа (например
// /shop-new) теряется на регистрации и человек упирается в тупик.
const registerTo = computed(() => {
  const r = safeRedirectPath(route.query.redirect)
  return r ? `/register?redirect=${encodeURIComponent(r)}` : '/register'
})

// signIn теперь возвращает путь кабинета напрямую из профиля (не через reactive computed)
async function onSubmit() {
  if (loading.value) return // защита от двойного сабмита (Enter до реактивного disable)
  loading.value = true
  try {
    const homePath = await signIn(email.value, password.value)
    // ?redirect используем, только если это безопасный НЕ-кабинетный путь (safeRedirectPath)
    await navigateTo(safeRedirectPath(route.query.redirect) ?? homePath)
  } catch (e) {
    toast.add({ title: t('auth.login.errorTitle'), description: t(authErrorKey(e)), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>{{ $t('auth.login.label') }}</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2">{{ $t('auth.login.title') }}</h1>
    <p class="text-ink-gray-600 mt-2 mb-8">{{ $t('auth.login.subtitle') }}</p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <UFormField :label="$t('auth.login.emailLabel')">
        <UInput v-model="email" type="email" size="lg" autocomplete="email" icon="i-lucide-mail" required class="w-full" />
      </UFormField>
      <UFormField :label="$t('auth.login.passwordLabel')">
        <UInput v-model="password" type="password" size="lg" autocomplete="current-password" icon="i-lucide-lock" required class="w-full" />
      </UFormField>
      <div class="text-right -mt-1">
        <NuxtLink to="/forgot" class="text-caption text-ink-burgundy font-semibold hover:underline">{{ $t('auth.login.forgotLink') }}</NuxtLink>
      </div>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" trailing-icon="i-lucide-arrow-right">{{ $t('auth.login.submit') }}</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-8 text-center">
      {{ $t('auth.login.noAccount') }}
      <NuxtLink :to="registerTo" class="text-ink-burgundy font-semibold">{{ $t('auth.login.registerLink') }}</NuxtLink>
    </p>
  </div>
</template>
