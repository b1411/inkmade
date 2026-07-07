<script setup lang="ts">
// Дисклеймеры (сводный документ). Текст — в shared/legal/documents.ts.
import { getLegalDoc } from '~~/shared/legal/documents'
const doc = getLegalDoc('disclaimers')
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
