<script setup lang="ts">
const { t } = useI18n()
const nav = computed(() => [
  { label: t('shopAdmin.nav.dashboard'), to: '/shop-admin', icon: 'i-lucide-layout-dashboard', exact: true },
  { label: t('shopAdmin.nav.items'), to: '/shop-admin/items', icon: 'i-lucide-shopping-bag' },
  { label: t('shopAdmin.nav.promos'), to: '/shop-admin/promos', icon: 'i-lucide-ticket-percent' },
  { label: t('shopAdmin.nav.orders'), to: '/shop-admin/orders', icon: 'i-lucide-receipt' },
  { label: t('shopAdmin.nav.finance'), to: '/shop-admin/finance', icon: 'i-lucide-wallet' },
  { label: t('shopAdmin.nav.branding'), to: '/shop-admin/branding', icon: 'i-lucide-palette' },
  { label: t('shopAdmin.nav.settings'), to: '/shop-admin/settings', icon: 'i-lucide-settings' },
])
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <WorkspaceShell :title="$t('shopAdmin.nav.title')" badge="B2B" :nav="nav" content-class="mx-auto w-full max-w-[1440px]">
    <template #header-actions>
      <UButton to="/account" color="neutral" variant="ghost" size="sm" icon="i-lucide-user">
        <span class="hidden sm:inline">{{ $t('shopAdmin.nav.account') }}</span>
      </UButton>
      <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">
        <span class="sr-only">{{ $t('shopAdmin.nav.signOut') }}</span>
      </UButton>
    </template>
    <template #rail-footer>
      <button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-ink-text-soft transition-colors hover:bg-white/5 hover:text-ink-text" @click="onSignOut">
        <UIcon name="i-lucide-log-out" class="size-4" />
        {{ $t('shopAdmin.nav.signOut') }}
      </button>
    </template>
    <slot />
  </WorkspaceShell>
</template>
