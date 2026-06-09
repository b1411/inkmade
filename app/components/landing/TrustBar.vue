<script setup lang="ts">
// Доверие-полоса (§5.2): тонкая строка сразу под hero, снимает первичные
// возражения мгновенно. Mono-буллеты через точки-разделители.
const points = [
  'Качество, что не стыдно носить',
  'Цвет согласуем перед печатью',
  'Трек-номер в кабинете',
  'Оплата только за подтверждённый заказ',
]
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream/70 border-y border-white/10">
    <div class="mx-auto max-w-(--container-max) px-4 py-4">
      <ul class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 ink-label text-center">
        <template v-for="(p, i) in points" :key="p">
          <li>{{ p }}</li>
          <li v-if="i < points.length - 1" aria-hidden="true" class="text-ink-burgundy-light">·</li>
        </template>
      </ul>
    </div>
  </section>
</template>
