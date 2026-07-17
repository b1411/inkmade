<script setup lang="ts">
const { t } = useI18n()
const nav = computed(() => [
  { label: t('account.nav.orders'), to: '/account/orders', icon: 'i-lucide-package' },
  { label: t('account.nav.designs'), to: '/account/designs', icon: 'i-lucide-shapes' },
  { label: t('account.nav.favorites'), to: '/account/favorites', icon: 'i-lucide-heart' },
  { label: t('account.nav.addresses'), to: '/account/addresses', icon: 'i-lucide-map-pin' },
  { label: t('account.nav.profile'), to: '/account', icon: 'i-lucide-user', exact: true },
])
const { signOut, profile, homePath } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }

watchEffect(() => {
  if (profile.value && profile.value.role !== 'customer') navigateTo(homePath.value)
})
</script>

<template>
  <WorkspaceShell :title="$t('account.title')" badge="ACCOUNT" :nav="nav" content-class="mx-auto w-full max-w-6xl">
    <template #header-actions>
      <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">
        <span class="hidden sm:inline">{{ $t('account.nav.signOut') }}</span>
      </UButton>
    </template>
    <template #rail-footer>
      <button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-ink-text-soft transition-colors hover:bg-white/5 hover:text-ink-text" @click="onSignOut">
        <UIcon name="i-lucide-log-out" class="size-4" />
        {{ $t('account.nav.signOut') }}
      </button>
    </template>
    <slot />
  </WorkspaceShell>
</template>
