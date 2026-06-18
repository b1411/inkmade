<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const route = useRoute()
const id = route.params.id as string
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.products.editLabel')" :title="$t('admin.products.editTitle')">
      <template #actions>
        <UButton to="/admin/products" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('admin.products.toList') }}</UButton>
      </template>
    </UiPageHeader>
    <AdminProductWizard :initial-id="id" />
  </div>
</template>
