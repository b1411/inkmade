<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
</script>

<template>
  <div>
    <UiSectionLabel accent>Новый товар</UiSectionLabel>
    <h1 class="ink-display text-2xl mt-2 mb-6">Создание товара</h1>
    <AdminProductWizard />
  </div>
</template>
