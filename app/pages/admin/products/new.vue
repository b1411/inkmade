<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.products.newPageLabel')" :title="$t('admin.products.newPageTitle')" />
    <AdminProductWizard />
  </div>
</template>
