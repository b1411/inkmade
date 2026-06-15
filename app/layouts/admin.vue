<script setup lang="ts">
// Админ-кабинет /admin (§8.2). Роль admin (middleware F0-13). Светлый контекст.
const nav = [
  { label: 'Дашборд', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: 'Финансы', to: '/admin/finance', icon: 'i-lucide-wallet' },
  { label: 'Дизайнеры', to: '/admin/designers', icon: 'i-lucide-palette' },
  { label: 'Заказы', to: '/admin/orders', icon: 'i-lucide-receipt' },
  { label: 'Возвраты', to: '/admin/returns', icon: 'i-lucide-undo-2' },
  { label: 'Категории', to: '/admin/categories', icon: 'i-lucide-folder-tree' },
  { label: 'Товары', to: '/admin/products', icon: 'i-lucide-shirt' },
  { label: 'Принты', to: '/admin/prints', icon: 'i-lucide-image' },
  { label: 'Склад', to: '/admin/stock', icon: 'i-lucide-boxes' },
  { label: 'Ценообразование', to: '/admin/pricing', icon: 'i-lucide-tags' },
  { label: 'Контент', to: '/admin/content', icon: 'i-lucide-newspaper' },
  { label: 'Юр. документы', to: '/admin/legal', icon: 'i-lucide-scale' },
  { label: 'Пользователи', to: '/admin/users', icon: 'i-lucide-users' },
  { label: 'Лиды', to: '/admin/leads', icon: 'i-lucide-contact' },
  { label: 'Аудит', to: '/admin/audit', icon: 'i-lucide-history' },
  { label: 'Настройки', to: '/admin/settings', icon: 'i-lucide-settings' },
]
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
      </nav>
    </aside>

    <main class="min-w-0">
      <div class="mx-auto max-w-(--container-max) px-6 py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
