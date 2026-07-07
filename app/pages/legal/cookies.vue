<script setup lang="ts">
// Политика использования файлов cookie. Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('cookies')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
