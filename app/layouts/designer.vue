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
  <div class="min-h-screen bg-ink-white text-ink-black">
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>
    <header class="border-b border-ink-gray-200">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UiAppLogo :subtitle="false" />
          <UiSectionLabel accent>{{ $t('studio.nav.designerStudio') }}</UiSectionLabel>
        </div>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">{{ $t('studio.nav.signOut') }}</UButton>
      </div>
    </header>

    <div class="mx-auto max-w-(--container-max) px-4 py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
      <nav class="space-y-1 md:sticky md:top-8 md:self-start" :aria-label="$t('studio.nav.designerStudio')">
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
      </nav>

      <main id="main-content" tabindex="-1" class="min-w-0 focus:outline-none">
        <slot />
      </main>
    </div>
  </div>
</template>
