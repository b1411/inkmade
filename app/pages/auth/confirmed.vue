<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
useHead({ title: () => `${t('auth.confirmed.title')} — INKMADE` })

const route = useRoute()
const supabase = useSupabaseClient()
const { fetchProfile, homePath } = useAuth()
const redirect = computed(() => safeRedirectPath(route.query.redirect))
const failed = ref(false)

const loginTo = computed(() => redirect.value
  ? `/login?redirect=${encodeURIComponent(redirect.value)}`
  : '/login')

onMounted(async () => {
  // Supabase разбирает токены подтверждения из URL асинхронно. Даём клиентскому
  // обработчику короткое окно, затем продолжаем исходный сценарий пользователя.
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetchProfile(true)
      await navigateTo(redirect.value ?? homePath.value, { replace: true })
      return
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  failed.value = true
})
</script>

<template>
  <div class="space-y-5 text-center" aria-live="polite">
    <UIcon :name="failed ? 'i-lucide-circle-alert' : 'i-lucide-loader-circle'" :class="['mx-auto size-12 text-ink-burgundy', !failed && 'animate-spin']" />
    <div>
      <UiSectionLabel accent>{{ $t('auth.confirmed.label') }}</UiSectionLabel>
      <h1 class="ink-display mt-2 text-3xl">{{ $t(failed ? 'auth.confirmed.failedTitle' : 'auth.confirmed.title') }}</h1>
      <p class="mt-3 text-ink-gray-600">{{ $t(failed ? 'auth.confirmed.failedText' : 'auth.confirmed.text') }}</p>
    </div>
    <UButton v-if="failed" :to="loginTo" color="primary" size="lg" block trailing-icon="i-lucide-arrow-right">
      {{ $t('auth.confirmed.login') }}
    </UButton>
  </div>
</template>
