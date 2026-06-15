<script setup lang="ts">
// Регистрация (§9.1). Без капчи на старте — не терять конверсию.
// Профиль с ролью customer создаётся триггером handle_new_user (миграция 0003).
import { LEGAL } from '~~/shared/config/legal'
import { normalizeKzPhone, isValidKzPhone } from '~~/shared/config/phone'

const { signUp } = useAuth()
const supabase = useSupabaseClient()
const toast = useToast()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const agree = ref(false)
const contactConsent = ref(false)
const loading = ref(false)
const done = ref(false)

const phoneValid = computed(() => isValidKzPhone(phone.value))

async function onSubmit() {
  if (!agree.value) {
    toast.add({ title: 'Подтвердите согласие с условиями', color: 'warning' })
    return
  }
  if (!phoneValid.value) {
    toast.add({ title: 'Укажите корректный номер', description: 'Формат: +7 700 123 45 67', color: 'warning' })
    return
  }
  loading.value = true
  try {
    await signUp(email.value, password.value, fullName.value, {
      phone: normalizeKzPhone(phone.value),
      marketingConsent: contactConsent.value,
    })
    // фиксируем согласие, если email-подтверждение отключено (сессия уже есть).
    // Иначе согласие гарантированно фиксируется на сервере при оформлении заказа (§24).
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_consents').insert([
        { user_id: user.id, consent_type: 'tos', doc_version: LEGAL.tosVersion },
        { user_id: user.id, consent_type: 'privacy', doc_version: LEGAL.privacyVersion },
      ])
    }
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
      <UFormField label="Телефон" :error="phone && !phoneValid ? 'Формат: +7 700 123 45 67' : undefined">
        <UInput v-model="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 700 123 45 67" required class="w-full" />
      </UFormField>
      <UFormField label="Пароль">
        <UInput v-model="password" type="password" autocomplete="new-password" required class="w-full" />
      </UFormField>
      <UCheckbox v-model="agree" required>
        <template #label>
          Я принимаю
          <NuxtLink to="/legal/terms" target="_blank" class="text-ink-burgundy font-semibold">Условия использования</NuxtLink>
          и
          <NuxtLink to="/legal/privacy" target="_blank" class="text-ink-burgundy font-semibold">Политику конфиденциальности</NuxtLink>
        </template>
      </UCheckbox>
      <UCheckbox v-model="contactConsent">
        <template #label>
          Согласен(на) получать сообщения о заказе и предложения в WhatsApp и по телефону
        </template>
      </UCheckbox>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" :disabled="!agree || !phoneValid">Зарегистрироваться</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-6">
      Уже есть аккаунт?
      <NuxtLink to="/login" class="text-ink-burgundy font-semibold">Войти</NuxtLink>
    </p>
  </div>
</template>
