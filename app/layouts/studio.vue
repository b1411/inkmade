<script setup lang="ts">
// Производственный кабинет /studio (§8.3). Роль operator/admin (middleware F0-13).
// Светлый рабочий контекст, бордо — только акценты.
const nav = [
  { label: 'Очередь', to: '/studio', icon: 'i-lucide-layout-list' },
  { label: 'Склад', to: '/studio/stock', icon: 'i-lucide-boxes' },
]
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <div class="min-h-screen bg-ink-white text-ink-black">
    <header class="bg-ink-black text-ink-cream">
      <div class="mx-auto max-w-(--container-max) px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UiAppLogo :subtitle="false" />
          <UBadge color="primary" variant="solid" size="sm">STUDIO</UBadge>
        </div>
        <nav class="flex gap-1">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="ink-label px-3 py-1.5 rounded-sm hover:bg-white/10 transition-colors"
            active-class="bg-white/15"
          >
            {{ item.label }}
          </NuxtLink>
          <button
            class="ink-label px-3 py-1.5 rounded-sm hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            @click="onSignOut"
          >
            <UIcon name="i-lucide-log-out" class="size-4" /> Выйти
          </button>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-(--container-max) px-4 py-6">
      <slot />
    </main>
  </div>
</template>
