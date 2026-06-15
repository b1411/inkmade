<script setup lang="ts">
// Вход (§9.1). Брендовый auth-экран (layout 'auth'). Логин требуется поздно —
// на checkout/шаринге, не на входе в каталог.
definePageMeta({ layout: 'auth' })
useHead({ title: 'Вход — INKMADE' })

const { signIn } = useAuth()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

// signIn теперь возвращает путь кабинета напрямую из профиля (не через reactive computed)
async function onSubmit() {
  loading.value = true
  try {
    const homePath = await signIn(email.value, password.value)
    const raw = route.query.redirect as string | undefined
    // Используем ?redirect только если это НЕ кабинет (чтобы не застрять в чужом кабинете)
    const cabinets = ['/admin', '/studio', '/studio-designer', '/account']
    const isSafeRedirect = raw && raw.startsWith('/') && !raw.startsWith('//') && !cabinets.some(c => raw.startsWith(c))
    await navigateTo(isSafeRedirect ? raw : homePath)
  } catch (e) {
    toast.add({ title: 'Не удалось войти', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>Вход</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2">С возвращением</h1>
    <p class="text-ink-gray-600 mt-2 mb-8">Войдите в аккаунт, чтобы продолжить.</p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <UFormField label="Email">
        <UInput v-model="email" type="email" size="lg" autocomplete="email" icon="i-lucide-mail" required class="w-full" />
      </UFormField>
      <UFormField label="Пароль">
        <UInput v-model="password" type="password" size="lg" autocomplete="current-password" icon="i-lucide-lock" required class="w-full" />
      </UFormField>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" trailing-icon="i-lucide-arrow-right">Войти</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-8 text-center">
      Нет аккаунта?
      <NuxtLink to="/register" class="text-ink-burgundy font-semibold">Зарегистрироваться</NuxtLink>
    </p>
  </div>
</template>
