<script setup lang="ts">
// Выбор зоны (§7.1). Показываем только зоны, валидные для режима материала (§5.2.1).
// Точка-индикатор — в зоне уже что-то расставлено (мультизона §7.1).
const { validZones, zoneName, zone, zonesWithPlacements } = useDesign()
defineProps<{ advanced?: boolean }>()
</script>

<template>
  <div>
    <UiSectionLabel>{{ $t('customize.zones.label') }}</UiSectionLabel>
    <div class="flex flex-wrap gap-2 mt-2">
      <button
        v-for="z in validZones"
        :key="z.id"
        class="px-3 py-2 rounded-md border text-caption transition-colors flex items-center gap-1.5"
        :class="z.name === zoneName ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
        @click="zoneName = z.name"
      >
        <span v-if="zonesWithPlacements.has(z.name)" class="size-1.5 rounded-full bg-ink-burgundy" />
        {{ z.title }}
      </button>
    </div>
    <!-- INK SYSTEM (§36.2): физический размер зоны. Конструктор — одно из мест,
         где §36.2 это разрешает: здесь размер рабочая информация, а не декор.
         Числа реальные, из print_zones. -->
    <BrandPrintArea v-if="advanced" :width-mm="zone?.max_width_mm" :height-mm="zone?.max_height_mm" class="mt-2" />

    <!-- подсказка по зоне (§7.1, placement_hint) -->
    <p v-if="zone?.placement_hint" class="text-caption text-ink-gray-600 mt-2 flex items-start gap-1">
      <UIcon name="i-lucide-lightbulb" class="size-4 mt-0.5 shrink-0 text-ink-warning" />
      {{ zone.placement_hint }}
    </p>
  </div>
</template>
