<script setup lang="ts">
// Условия использования (правила сервиса). Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('terms')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
