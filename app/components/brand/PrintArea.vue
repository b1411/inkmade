<script setup lang="ts">
// INK SYSTEM · физические размеры зоны печати (спека §36.2, формат
// `PRINT AREA 310 × 380 MM`).
//
// §36.2 прямо ограничивает место: это НЕ должно доминировать в retail-интерфейсе.
// Показываем только там, где размер — рабочая информация: конструктор, технические
// детали товара, production-preview, B2B-проект. На витрине и в hero — нельзя.
//
// Числа приходят из print_zones (max_width_mm / max_height_mm) — то есть это
// реальный размер конкретной зоны, а не подпись-украшение. §25 напоминает, что
// производство обязано подтвердить их по каждой основе.
const props = defineProps<{ widthMm?: number | null, heightMm?: number | null }>()

// Округляем до целых мм: доли миллиметра в UI — шум, в них нет смысла для человека.
const label = computed(() => {
  const w = Number(props.widthMm)
  const h = Number(props.heightMm)
  if (!w || !h) return null
  return `PRINT AREA ${Math.round(w)} × ${Math.round(h)} MM`
})
</script>

<template>
  <p v-if="label" class="ink-label text-ink-text-muted">{{ label }}</p>
</template>

