<script setup lang="ts">
// Кабинет дизайнера (CRM §4). Мотивирующий: заработок на виду.
const { t } = useI18n()
const nav = computed(() => [
  { label: t('studio.nav.dashboard'), to: '/studio-designer', icon: 'i-lucide-layout-dashboard' },
  { label: t('studio.nav.prints'), to: '/studio-designer/prints', icon: 'i-lucide-image' },
  { label: t('studio.nav.finance'), to: '/studio-designer/finance', icon: 'i-lucide-wallet' },
  { label: t('studio.nav.profile'), to: '/studio-designer/profile', icon: 'i-lucide-user' },
])
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <WorkspaceShell :title="$t('studio.nav.designerStudio')" badge="DESIGNER" :nav="nav" content-class="mx-auto w-full max-w-[1440px]">
    <template #header-actions>
      <UButton to="/catalog" color="neutral" variant="ghost" size="sm" icon="i-lucide-shirt">
        <span class="hidden sm:inline">{{ $t('nav.catalog') }}</span>
      </UButton>
    </template>
    <template #rail-footer>
      <button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-ink-text-soft transition-colors hover:bg-white/5 hover:text-ink-text" @click="onSignOut">
        <UIcon name="i-lucide-log-out" class="size-4" />
        {{ $t('studio.nav.signOut') }}
      </button>
    </template>
    <slot />
  </WorkspaceShell>
</template>
