<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Активация приглашения дизайнера (§7.5). Требует входа: auth-middleware уводит на /login
// с возвратом сюда. После claim роль становится designer и открывается /studio-designer.
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const token = route.params.token as string
const supabase = useSupabaseClient<Database>()
const { fetchProfile } = useAuth()

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
      message.value = `Вы дизайнер INKMADE. Персональная ставка роялти: ${res.royalty_pct}%.`
    } else {
      state.value = 'used'
      message.value = 'Это приглашение уже использовано или отозвано.'
    }
  } catch (e) {
    state.value = 'error'
    message.value = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
  }
})
</script>

<template>
  <div class="max-w-md mx-auto py-12 text-center space-y-4">
    <UiSectionLabel accent>Приглашение</UiSectionLabel>
    <div v-if="state === 'loading'" class="text-ink-gray-600">Активируем приглашение…</div>

    <template v-else-if="state === 'ok'">
      <h1 class="ink-display text-h2">Добро пожаловать в студию!</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/studio-designer" color="primary" size="lg" icon="i-lucide-palette">В кабинет дизайнера</UButton>
    </template>

    <template v-else>
      <h1 class="ink-display text-h2">Не удалось активировать</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/" color="neutral" variant="subtle">На главную</UButton>
    </template>
  </div>
</template>
