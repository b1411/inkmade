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
    message.value = getFetchMessage(e)
  }
})
</script>

<template>
  <section class="mx-auto grid max-w-5xl overflow-hidden border border-ink-gray-200 bg-ink-white shadow-sm lg:grid-cols-[.95fr_1.05fr]">
    <div class="relative min-h-80 overflow-hidden bg-ink-black lg:min-h-[580px]">
      <NuxtImg src="/media/prints/alatau-night-v01.webp" alt="" class="absolute inset-0 size-full object-cover" sizes="(max-width: 1023px) 100vw, 480px" loading="eager" />
      <div class="absolute inset-0 bg-linear-to-t from-ink-black via-transparent to-transparent" />
      <div class="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
        <p class="ink-label text-white/55">INKMADE / CREATOR ACCESS</p>
        <p class="ink-display mt-2 text-4xl">{{ $t('legal.invite.label') }}</p>
      </div>
    </div>
    <div class="flex min-h-[420px] flex-col justify-center p-7 text-center sm:p-12">
      <UiSectionLabel accent>{{ $t('legal.invite.label') }}</UiSectionLabel>
      <div v-if="state === 'loading'" class="flex flex-col items-center gap-4 py-10 text-ink-gray-600" role="status" aria-live="polite">
        <span class="grid size-16 place-items-center rounded-full border border-ink-burgundy/20 bg-ink-burgundy/5">
          <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-ink-burgundy" />
        </span>
        {{ $t('legal.invite.loading') }}
      </div>
      <template v-else-if="state === 'ok'">
        <UIcon name="i-lucide-badge-check" class="mx-auto mt-7 size-12 text-ink-burgundy" />
        <h1 class="ink-display mt-4 text-h2">{{ $t('legal.invite.okTitle') }}</h1>
        <p class="mx-auto mt-3 max-w-md text-ink-gray-600">{{ message }}</p>
        <UButton to="/studio-designer" color="primary" size="lg" icon="i-lucide-palette" class="mx-auto mt-7">{{ $t('legal.invite.toStudio') }}</UButton>
      </template>
      <template v-else>
        <UIcon name="i-lucide-link-2-off" class="mx-auto mt-7 size-12 text-ink-gray-400" />
        <h1 class="ink-display mt-4 text-h2">{{ $t('legal.invite.errorTitle') }}</h1>
        <p class="mx-auto mt-3 max-w-md text-ink-gray-600">{{ message }}</p>
        <UButton to="/" color="neutral" variant="subtle" class="mx-auto mt-7">{{ $t('legal.invite.toHome') }}</UButton>
      </template>
    </div>
  </section>
</template>
