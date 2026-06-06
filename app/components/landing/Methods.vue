<script setup lang="ts">
// Методы нанесения (§6, аккордеон). Только то, что делает цех на старте.
// Шелкография/вышивка НЕ анонсируются до готовности (§1.2, §6).
const items = [
  { label: 'DTG — прямая цифровая печать', icon: 'i-lucide-printer', content: 'Прямая печать по хлопку. Фотографичная детализация, мягкое на ощупь нанесение. Подходит для сложных цветных принтов на трикотаже.' },
  { label: 'DTF — термоперенос', icon: 'i-lucide-layers', content: 'Перенос плёнки под давлением и температурой. Яркие плотные цвета, стойкость к стирке, работает по разным тканям.' },
  { label: 'Сублимация — full-print', icon: 'i-lucide-shirt', content: 'Краситель проникает в волокно синтетики — запечатка всей поверхности без границ и фактуры поверх ткани. Для спортивных и full-print изделий.' },
]
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream">
    <div class="mx-auto max-w-(--container-max) px-4 py-20">
      <UiSectionLabel class="text-ink-cream/60">Технологии печати</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-8">Методы нанесения</h2>
      <UAccordion :items="items" />
    </div>
  </section>
</template>
