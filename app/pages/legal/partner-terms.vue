<script setup lang="ts">
// Условия для владельцев магазинов (B2B). Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('partner-terms')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
