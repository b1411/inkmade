<script setup lang="ts">
// Админ-кабинет /admin (§8.2). Роль admin (middleware F0-13). Светлый контекст.
const { t } = useI18n()
const nav = computed(() => [
  { label: t('admin.nav.dashboard'), to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: t('admin.nav.finance'), to: '/admin/finance', icon: 'i-lucide-wallet' },
  { label: t('admin.nav.designers'), to: '/admin/designers', icon: 'i-lucide-palette' },
  { label: t('admin.nav.orders'), to: '/admin/orders', icon: 'i-lucide-receipt' },
  { label: t('admin.nav.returns'), to: '/admin/returns', icon: 'i-lucide-undo-2' },
  { label: t('admin.nav.categories'), to: '/admin/categories', icon: 'i-lucide-folder-tree' },
  { label: t('admin.nav.products'), to: '/admin/products', icon: 'i-lucide-shirt' },
  { label: t('admin.nav.prints'), to: '/admin/prints', icon: 'i-lucide-image' },
  { label: t('admin.nav.stock'), to: '/admin/stock', icon: 'i-lucide-boxes' },
  { label: t('admin.nav.pricing'), to: '/admin/pricing', icon: 'i-lucide-tags' },
  { label: t('admin.nav.content'), to: '/admin/content', icon: 'i-lucide-newspaper' },
  { label: t('admin.nav.legal'), to: '/admin/legal', icon: 'i-lucide-scale' },
  { label: t('admin.nav.customers'), to: '/admin/customers', icon: 'i-lucide-user-round-search' },
  { label: t('admin.nav.users'), to: '/admin/users', icon: 'i-lucide-users' },
  { label: t('admin.nav.leads'), to: '/admin/leads', icon: 'i-lucide-contact' },
  { label: t('admin.nav.audit'), to: '/admin/audit', icon: 'i-lucide-history' },
  { label: t('admin.nav.settings'), to: '/admin/settings', icon: 'i-lucide-settings' },
])
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <div class="min-h-screen bg-ink-white text-ink-black grid grid-cols-1 md:grid-cols-[240px_1fr]">
    <aside class="bg-ink-black-soft text-ink-cream md:min-h-screen">
      <div class="px-4 h-16 flex items-center gap-2 border-b border-white/10">
        <UiAppLogo :subtitle="false" />
        <UBadge color="primary" variant="solid" size="sm">ADMIN</UBadge>
      </div>
      <nav class="p-3 space-y-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors"
          active-class="bg-ink-burgundy"
        >
          <UIcon :name="item.icon" class="size-4" />
          {{ item.label }}
        </NuxtLink>

        <button
          class="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-md text-ink-cream/70 hover:bg-white/10 hover:text-ink-cream transition-colors"
          @click="onSignOut"
        >
          <UIcon name="i-lucide-log-out" class="size-4" />
          {{ $t('admin.nav.signOut') }}
        </button>
      </nav>
    </aside>

    <main class="min-w-0">
      <div class="mx-auto max-w-(--container-max) px-6 py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
