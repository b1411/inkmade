<script setup lang="ts">
// Методы нанесения (§5.5, аккордеон). Только то, что делает цех на старте.
// Шелкография/вышивка НЕ анонсируются до готовности.
const items = [
  { label: 'DTG — прямая цифровая', icon: 'i-lucide-printer', content: 'Краска проникает в ткань. Полноцвет, фотопринт, мягко на ощупь. Идеально для хлопка.' },
  { label: 'DTF — термоперенос', icon: 'i-lucide-layers', content: 'Яркий насыщенный принт на любой ткани. Держит цвет и стирку.' },
  { label: 'Сублимация — full-print', icon: 'i-lucide-shirt', content: 'Принт по всей поверхности без границ. Только для светлой синтетики.' },
]
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream">
    <div class="mx-auto max-w-(--container-max) px-4" style="padding-block: var(--section-pad)">
      <UiSectionLabel class="text-ink-cream/60">Технологии</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-8">Как мы печатаем</h2>
      <UAccordion :items="items" />
    </div>
  </section>
</template>
