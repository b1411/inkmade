<script setup lang="ts">
// Публичная оферта — договор купли-продажи. Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('offer')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
