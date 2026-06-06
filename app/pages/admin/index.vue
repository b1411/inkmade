<script setup lang="ts">
// Дашборд админа (§8.2) — аналитика и управление каталогом в Фазе 1.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
</script>

<template>
  <div>
    <UiSectionLabel accent>Дашборд</UiSectionLabel>
    <h1 class="ink-display text-2xl mt-2 mb-6">Админ-кабинет</h1>
    <p class="text-ink-gray-600">
      Мастер создания товара, заказы, склад и аналитика появятся в Фазе 1.
    </p>
  </div>
</template>
