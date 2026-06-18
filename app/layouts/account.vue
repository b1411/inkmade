<script setup lang="ts">
// Личный кабинет клиента (§8.1). Светлый контекст (§2.2).
const { t } = useI18n()
const nav = computed(() => [
  { label: t('account.nav.orders'), to: '/account/orders', icon: 'i-lucide-package' },
  { label: t('account.nav.designs'), to: '/account/designs', icon: 'i-lucide-shapes' },
  { label: t('account.nav.favorites'), to: '/account/favorites', icon: 'i-lucide-heart' },
  { label: t('account.nav.addresses'), to: '/account/addresses', icon: 'i-lucide-map-pin' },
  { label: t('account.nav.profile'), to: '/account', icon: 'i-lucide-user' },
])
const { signOut, profile, homePath } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
// админ/оператор/дизайнер не залипают в клиентском кабинете — уводим в их кабинет
watchEffect(() => {
  if (profile.value && profile.value.role !== 'customer') navigateTo(homePath.value)
})
</script>

<template>
  <div class="min-h-screen bg-ink-white text-ink-black">
    <header class="border-b border-ink-gray-200">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <UiAppLogo :subtitle="false" />
        <div class="flex items-center gap-4">
          <UiSectionLabel>{{ $t('account.title') }}</UiSectionLabel>
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">{{ $t('account.nav.signOut') }}</UButton>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-(--container-max) px-4 py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
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
