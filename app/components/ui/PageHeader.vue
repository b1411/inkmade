<script setup lang="ts">
// Единый заголовок внутренней страницы: моно-лейбл + дисплейный заголовок +
// описание, со слотом действий справа. Заменяет ручную вёрстку h1 на каждой
// странице — единый ритм и типографика во всех кабинетах.
interface Props {
  label?: string
  title: string
  description?: string
}
defineProps<Props>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div class="min-w-0">
      <UiSectionLabel v-if="label" accent>{{ label }}</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-2">{{ title }}</h1>
      <p v-if="description" class="text-ink-gray-600 mt-2 max-w-2xl">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0"><slot name="actions" /></div>
  </div>
</template>
