<script setup lang="ts">
// Доверие-полоса (§5.2): тонкая строка сразу под hero, снимает первичные
// возражения мгновенно. Mono-буллеты через точки-разделители.
const { t } = useI18n()
const points = computed(() =>
  [0, 1, 2, 3].map(i => t(`landing.trustBar.points[${i}]`)),
)
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
