<script setup lang="ts">
// Вход (§9.1). Логин требуется поздно — на checkout/шаринге, не на входе в каталог.
const { signIn, homePath } = useAuth()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await signIn(email.value, password.value)
    // только внутренние пути: защита от open redirect на внешний домен.
    // Без явного redirect ведём в кабинет по роли (admin→/admin, operator→/studio, …).
    const raw = route.query.redirect as string | undefined
    const redirect = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : homePath.value
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
