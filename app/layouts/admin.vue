<script setup lang="ts">
import { FEATURES } from '~~/shared/config/features'

const { t } = useI18n()
const nav = computed(() => [
  { label: t('admin.nav.dashboard'), to: '/admin', icon: 'i-lucide-layout-dashboard', exact: true },
  { label: t('admin.nav.finance'), to: '/admin/finance', icon: 'i-lucide-wallet', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.designers'), to: '/admin/designers', icon: 'i-lucide-palette', show: FEATURES.designerMarketplace },
  { label: t('admin.nav.orders'), to: '/admin/orders', icon: 'i-lucide-receipt' },
  { label: t('admin.nav.returns'), to: '/admin/returns', icon: 'i-lucide-undo-2' },
  { label: t('admin.nav.categories'), to: '/admin/categories', icon: 'i-lucide-folder-tree' },
  { label: t('admin.nav.products'), to: '/admin/products', icon: 'i-lucide-shirt' },
  { label: t('admin.nav.prints'), to: '/admin/prints', icon: 'i-lucide-image' },
  { label: t('admin.nav.stock'), to: '/admin/stock', icon: 'i-lucide-boxes' },
  { label: t('admin.nav.pricing'), to: '/admin/pricing', icon: 'i-lucide-tags', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.content'), to: '/admin/content', icon: 'i-lucide-newspaper', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.legal'), to: '/admin/legal', icon: 'i-lucide-scale', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.customers'), to: '/admin/customers', icon: 'i-lucide-user-round-search', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.users'), to: '/admin/users', icon: 'i-lucide-users' },
  { label: t('admin.nav.shops'), to: '/admin/shops', icon: 'i-lucide-store', show: FEATURES.b2bShops },
  { label: t('admin.nav.leads'), to: '/admin/leads', icon: 'i-lucide-contact', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.audit'), to: '/admin/audit', icon: 'i-lucide-history', show: FEATURES.advancedAdmin },
  { label: t('admin.nav.settings'), to: '/admin/settings', icon: 'i-lucide-settings' },
].filter(item => item.show !== false))
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <WorkspaceShell :title="$t('admin.nav.dashboard')" badge="ADMIN" :nav="nav" content-class="mx-auto w-full max-w-[1600px]">
    <template #header-actions>
      <UButton to="/" color="neutral" variant="ghost" size="sm" icon="i-lucide-external-link">
        <span class="hidden sm:inline">INKMADE</span>
      </UButton>
    </template>
    <template #rail-footer>
      <button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-ink-text-soft transition-colors hover:bg-white/5 hover:text-ink-text" @click="onSignOut">
        <UIcon name="i-lucide-log-out" class="size-4" />
        {{ $t('admin.nav.signOut') }}
      </button>
    </template>
    <slot />
  </WorkspaceShell>
</template>
