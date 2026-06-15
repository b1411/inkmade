<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
</script>

<template>
  <div>
    <UiPageHeader label="Новый товар" title="Создание товара" />
    <AdminProductWizard />
  </div>
</template>
