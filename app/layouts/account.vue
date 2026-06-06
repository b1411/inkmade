<script setup lang="ts">
// Личный кабинет клиента (§8.1). Светлый контекст (§2.2).
const nav = [
  { label: 'Мои заказы', to: '/account/orders', icon: 'i-lucide-package' },
  { label: 'Мои дизайны', to: '/account/designs', icon: 'i-lucide-shapes' },
  { label: 'Профиль', to: '/account', icon: 'i-lucide-user' },
]
</script>

<template>
  <div class="min-h-screen bg-ink-white text-ink-black">
    <header class="border-b border-ink-gray-200">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <UiAppLogo :subtitle="false" />
        <UiSectionLabel>Личный кабинет</UiSectionLabel>
      </div>
    </header>

    <div class="mx-auto max-w-(--container-max) px-4 py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
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
