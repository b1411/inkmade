<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const route = useRoute()
const id = route.params.id as string
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Редактирование</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-2">Товар</h1>
      </div>
      <UButton to="/admin/products" color="neutral" variant="ghost" icon="i-lucide-arrow-left">К списку</UButton>
    </div>
    <AdminProductWizard :initial-id="id" />
  </div>
</template>
