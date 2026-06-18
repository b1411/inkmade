<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Активация приглашения дизайнера (§7.5). Требует входа: auth-middleware уводит на /login
// с возвратом сюда. После claim роль становится designer и открывается /studio-designer.
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const token = route.params.token as string
const supabase = useSupabaseClient<Database>()
const { fetchProfile } = useAuth()
const { t } = useI18n()

const state = ref<'loading' | 'ok' | 'used' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  try {
    const { data, error } = await supabase.rpc('claim_designer_invite', { p_token: token })
    if (error) throw error
    const res = data as { ok?: boolean; reason?: string; royalty_pct?: number }
    if (res?.ok) {
      await fetchProfile(true)
      state.value = 'ok'
      message.value = t('legal.invite.okMessage', { pct: res.royalty_pct })
    } else {
      state.value = 'used'
      message.value = t('legal.invite.used')
    }
  } catch (e) {
    state.value = 'error'
    message.value = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
  }
})
</script>

<template>
  <div class="max-w-md mx-auto py-12 text-center space-y-4">
    <UiSectionLabel accent>{{ $t('legal.invite.label') }}</UiSectionLabel>
    <div v-if="state === 'loading'" class="flex flex-col items-center gap-3 text-ink-gray-600 py-6">
      <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-ink-burgundy" />
      {{ $t('legal.invite.loading') }}
    </div>

    <template v-else-if="state === 'ok'">
      <h1 class="ink-display text-h2">{{ $t('legal.invite.okTitle') }}</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/studio-designer" color="primary" size="lg" icon="i-lucide-palette">{{ $t('legal.invite.toStudio') }}</UButton>
    </template>

    <template v-else>
      <h1 class="ink-display text-h2">{{ $t('legal.invite.errorTitle') }}</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/" color="neutral" variant="subtle">{{ $t('legal.invite.toHome') }}</UButton>
    </template>
  </div>
</template>
