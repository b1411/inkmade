<script setup lang="ts">
// Пустое состояние (§4.4): иконка + дружелюбный заголовок + подзаголовок + CTA (слот).
// Отсутствие проработанных пустых состояний = ощущение недоделанности (§4.4 ТЗ).
interface Props {
  icon?: string
  title: string
  text?: string
}
withDefaults(defineProps<Props>(), { icon: 'i-lucide-inbox' })
</script>

<template>
  <div class="py-16 flex flex-col items-center text-center">
    <div class="size-16 rounded-full bg-ink-gray-50 flex items-center justify-center text-ink-burgundy">
      <UIcon :name="icon" class="size-8" />
    </div>
    <h3 class="ink-display text-h3 mt-5">{{ title }}</h3>
    <p v-if="text" class="text-ink-gray-600 mt-2 max-w-md">{{ text }}</p>
    <div v-if="$slots.default" class="mt-6"><slot /></div>
  </div>
</template>
