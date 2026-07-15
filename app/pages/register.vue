<script setup lang="ts">
// Регистрация (§9.1). Без капчи на старте — не терять конверсию.
// Профиль с ролью customer создаётся триггером handle_new_user (миграция 0003).
import { LEGAL } from '~~/shared/config/legal'
import { normalizeKzPhone, isValidKzPhone } from '~~/shared/config/phone'

definePageMeta({ layout: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('auth.register.label')} — INKMADE` })

const { signUp } = useAuth()
const supabase = useSupabaseClient()
const route = useRoute()
const toast = useToast()

// Цель, ради которой человек пришёл регистрироваться (например /shop-new). Раньше
// ?redirect здесь не читался вовсе: после регистрации показывался алерт без единой
// ссылки — сценарий обрывался, и цель терялась.
const redirect = computed(() => safeRedirectPath(route.query.redirect))
const loginTo = computed(() =>
  redirect.value ? `/login?redirect=${encodeURIComponent(redirect.value)}` : '/login',
)

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
  if (loading.value) return // защита от двойного сабмита
  if (!agree.value) {
    toast.add({ title: t('auth.register.consentWarning'), color: 'warning' })
    return
  }
  if (!phoneValid.value) {
    toast.add({ title: t('auth.register.phoneWarningTitle'), description: t('auth.register.phoneWarningDescription'), color: 'warning' })
    return
  }
  if (password.value.length < 6) {
    toast.add({ title: t('auth.register.passwordWarningTitle'), description: t('auth.register.passwordWarningDescription'), color: 'warning' })
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
      // сессия уже есть → ведём туда, зачем пришли (или в свой кабинет), а не в алерт
      await navigateTo(redirect.value ?? '/account')
      return
    }
    // email-подтверждение включено: сессии нет, показываем алерт со ссылкой на вход,
    // который донесёт ?redirect до цели после подтверждения почты.
    done.value = true
  } catch (e) {
    toast.add({ title: t('auth.register.errorTitle'), description: t(authErrorKey(e)), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>{{ $t('auth.register.label') }}</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2">{{ $t('auth.register.title') }}</h1>
    <p class="text-ink-gray-600 mt-2 mb-8">{{ $t('auth.register.subtitle') }}</p>

    <div v-if="done" class="space-y-4">
      <UAlert
        color="success"
        icon="i-lucide-mail-check"
        :title="$t('auth.register.doneTitle')"
        :description="$t('auth.register.doneDescription')"
      />
      <UButton :to="loginTo" color="primary" size="lg" block trailing-icon="i-lucide-arrow-right">
        {{ $t('auth.register.doneAction') }}
      </UButton>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <UFormField :label="$t('auth.register.nameLabel')">
        <UInput v-model="fullName" size="lg" autocomplete="name" icon="i-lucide-user" class="w-full" />
      </UFormField>
      <UFormField :label="$t('auth.register.emailLabel')">
        <UInput v-model="email" type="email" size="lg" autocomplete="email" icon="i-lucide-mail" required class="w-full" />
      </UFormField>
      <UFormField :label="$t('auth.register.phoneLabel')" :error="phone && !phoneValid ? $t('auth.register.phoneError') : undefined">
        <UInput v-model="phone" type="tel" size="lg" autocomplete="tel" inputmode="tel" icon="i-lucide-phone" :placeholder="$t('auth.register.phonePlaceholder')" required class="w-full" />
      </UFormField>
      <UFormField :label="$t('auth.register.passwordLabel')">
        <UInput v-model="password" type="password" size="lg" autocomplete="new-password" icon="i-lucide-lock" required class="w-full" />
      </UFormField>
      <UCheckbox v-model="agree" required>
        <template #label>
          {{ $t('auth.register.agreePrefix') }}
          <NuxtLink to="/legal/terms" target="_blank" class="text-ink-burgundy font-semibold">{{ $t('auth.register.agreeTerms') }}</NuxtLink>
          {{ $t('auth.register.agreeConjunction') }}
          <NuxtLink to="/legal/privacy" target="_blank" class="text-ink-burgundy font-semibold">{{ $t('auth.register.agreePrivacy') }}</NuxtLink>
        </template>
      </UCheckbox>
      <UCheckbox v-model="contactConsent">
        <template #label>
          {{ $t('auth.register.contactConsent') }}
        </template>
      </UCheckbox>
      <UButton type="submit" color="primary" size="lg" block :loading="loading" :disabled="!agree || !phoneValid" trailing-icon="i-lucide-arrow-right">{{ $t('auth.register.submit') }}</UButton>
    </form>

    <p class="text-caption text-ink-gray-600 mt-8 text-center">
      {{ $t('auth.register.haveAccount') }}
      <NuxtLink :to="loginTo" class="text-ink-burgundy font-semibold">{{ $t('auth.register.loginLink') }}</NuxtLink>
    </p>
  </div>
</template>
