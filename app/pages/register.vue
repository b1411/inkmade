<script setup lang="ts">
// Регистрация (§9.1). Без капчи на старте — не терять конверсию.
// Профиль с ролью customer создаётся триггером handle_new_user (миграция 0003).
const { signUp } = useAuth()
const toast = useToast()

const fullName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const done = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await signUp(email.value, password.value, fullName.value)
    done.value = true
  } catch (e) {
    toast.add({ title: 'Не удалось зарегистрироваться', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-8">
    <UiSectionLabel accent>Регистрация</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Создать аккаунт</h1>

    <UAlert
      v-if="done"
      color="success"
      title="Почти готово"
      description="Подтвердите email по ссылке из письма, затем войдите."
    />

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <UFormField label="Имя">
        <UInput v-model="fullName" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField label="Email">
        <UInput v-model="email" type="email" autocomplete="email" required class="w-full" />
      </UFormField>
      <UFormField label="Пароль">
        <UInput v-model="password" type="password" autocomplete="new-password" required class="w-full" />
      </UFormField>
      <UButton type="submit" color="primary" size="lg" block :loading="loading">Зарегистрироваться</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-6">
      Уже есть аккаунт?
      <NuxtLink to="/login" class="text-ink-burgundy font-semibold">Войти</NuxtLink>
    </p>
  </div>
</template>
