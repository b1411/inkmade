<script setup lang="ts">
// Библиотека принтов (§8.2.2) — второй канал продаж. Наполнение в Фазе 2 (F2-12).
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
</script>

<template>
  <div>
    <UiSectionLabel accent>Принты</UiSectionLabel>
    <h1 class="ink-display text-2xl mt-2 mb-6">Библиотека принтов</h1>
    <p class="text-ink-gray-600">Загрузка курируемых принтов появится вместе с галереей готовых дизайнов (Фаза 2).</p>
  </div>
</template>
