<script setup lang="ts">
// Доставка и возврат. Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('delivery')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
