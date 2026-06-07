<script setup lang="ts">
// Кабинет дизайнера (CRM §4). Мотивирующий: заработок на виду.
const nav = [
  { label: 'Дашборд', to: '/studio-designer', icon: 'i-lucide-layout-dashboard' },
  { label: 'Мои принты', to: '/studio-designer/prints', icon: 'i-lucide-image' },
  { label: 'Финансы', to: '/studio-designer/finance', icon: 'i-lucide-wallet' },
  { label: 'Профиль', to: '/studio-designer/profile', icon: 'i-lucide-user' },
]
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <div class="min-h-screen bg-ink-white text-ink-black">
    <header class="border-b border-ink-gray-200">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UiAppLogo :subtitle="false" />
          <UiSectionLabel accent>Студия дизайнера</UiSectionLabel>
        </div>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="onSignOut">Выйти</UButton>
      </div>
    </header>

    <div class="mx-auto max-w-(--container-max) px-4 py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
      <aside class="space-y-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-body hover:bg-ink-gray-200 transition-colors"
          active-class="bg-ink-gray-200 font-semibold"
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
