<script setup lang="ts">
// Доверие-полоса (§5.2): тонкая строка сразу под hero, снимает первичные
// возражения мгновенно. Mono-буллеты через точки-разделители.
const { t } = useI18n()
const points = computed(() =>
  [0, 1, 2, 3].map(i => t(`landing.trustBar.points[${i}]`)),
)
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] overflow-hidden border-y border-white/10 bg-ink-black text-ink-cream/70">
    <div
      class="mx-auto max-w-(--container-max) overflow-x-auto px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
      role="region"
      :aria-label="t('landing.trustBar.ariaLabel')"
      tabindex="0"
    >
      <UiReveal :y="12" :duration="600" class="min-w-max">
        <ul class="flex min-h-12 items-center gap-6 ink-label text-center lg:min-w-0 lg:justify-center">
          <li v-for="p in points" :key="p" class="inline-flex shrink-0 items-center gap-2">
            <UIcon name="i-lucide-check" class="size-3.5 shrink-0 text-ink-burgundy-light" />
            <span>{{ p }}</span>
          </li>
        </ul>
      </UiReveal>
    </div>
  </section>
</template>
