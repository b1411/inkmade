<script setup lang="ts">
// Кабинет владельца B2B-магазина (Фаза B3). Владелец управляет своей витриной,
// брендингом и позициями. Роль — обычный customer + shops.owner_id (middleware shop-owner).
const { t } = useI18n()
const nav = computed(() => [
  { label: t('shopAdmin.nav.dashboard'), to: '/shop-admin', icon: 'i-lucide-layout-dashboard' },
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
  <div class="min-h-screen bg-ink-white text-ink-black">
    <header class="border-b border-ink-gray-200">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UiAppLogo :subtitle="false" />
          <UiSectionLabel accent>{{ $t('shopAdmin.nav.title') }}</UiSectionLabel>
        </div>
        <div class="flex items-center gap-2">
          <UButton to="/account" color="neutral" variant="ghost" size="sm" icon="i-lucide-user">{{ $t('shopAdmin.nav.account') }}</UButton>
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">{{ $t('shopAdmin.nav.signOut') }}</UButton>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-(--container-max) px-4 py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
      <aside class="space-y-1 md:sticky md:top-8 md:self-start">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-body text-ink-gray-600 hover:bg-ink-gray-50 hover:text-ink-black transition-colors"
          active-class="!bg-ink-burgundy !text-ink-cream font-semibold shadow-sm"
        >
          <UIcon :name="item.icon" class="size-4" />
          {{ item.label }}
        </NuxtLink>
      </aside>

      <main class="min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
