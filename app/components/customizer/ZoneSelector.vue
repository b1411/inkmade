<script setup lang="ts">
// Выбор зоны (§7.1). Показываем только зоны, валидные для режима материала (§5.2.1).
const { validZones, zoneName, zone } = useDesign()
</script>

<template>
  <div>
    <UiSectionLabel>Зона нанесения</UiSectionLabel>
    <div class="flex flex-wrap gap-2 mt-2">
      <button
        v-for="z in validZones"
        :key="z.id"
        class="px-3 py-2 rounded-md border text-caption transition-colors"
        :class="z.name === zoneName ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
        @click="zoneName = z.name"
      >
        {{ z.title }}
      </button>
    </div>
    <!-- подсказка по зоне (§7.1, placement_hint) -->
    <p v-if="zone?.placement_hint" class="text-caption text-ink-gray-600 mt-2 flex items-start gap-1">
      <UIcon name="i-lucide-lightbulb" class="size-4 mt-0.5 shrink-0 text-ink-warning" />
      {{ zone.placement_hint }}
    </p>
  </div>
</template>
