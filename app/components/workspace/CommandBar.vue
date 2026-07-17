<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  resultCount?: number
  sticky?: boolean
}>(), { modelValue: '', placeholder: '', resultCount: undefined, sticky: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    :class="[
      'flex flex-col gap-3 border border-ink-gray-200 bg-white p-3 sm:flex-row sm:items-center',
      sticky && 'sticky top-3 z-20 shadow-sm',
    ]"
    role="search"
  >
    <UInput
      :model-value="props.modelValue"
      icon="i-lucide-search"
      :placeholder="props.placeholder"
      class="w-full sm:w-64"
      @update:model-value="emit('update:modelValue', String($event))"
    />
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <slot name="filters" />
    </div>
    <span v-if="resultCount !== undefined" class="shrink-0 font-mono text-[10px] uppercase tracking-[.1em] text-ink-gray-400" aria-live="polite">
      # {{ resultCount }}
    </span>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
