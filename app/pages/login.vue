<script setup lang="ts">
// Вход (§9.1). Логин требуется поздно — на checkout/шаринге, не на входе в каталог.
const { signIn } = useAuth()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await signIn(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/account'
    await navigateTo(redirect)
  } catch (e) {
    toast.add({ title: 'Не удалось войти', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-8">
    <UiSectionLabel accent>Вход</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">С возвращением</h1>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <UFormField label="Email">
        <UInput v-model="email" type="email" autocomplete="email" required class="w-full" />
      </UFormField>
      <UFormField label="Пароль">
        <UInput v-model="password" type="password" autocomplete="current-password" required class="w-full" />
      </UFormField>
      <UButton type="submit" color="primary" size="lg" block :loading="loading">Войти</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-6">
      Нет аккаунта?
      <NuxtLink to="/register" class="text-ink-burgundy font-semibold">Зарегистрироваться</NuxtLink>
    </p>
  </div>
</template>
