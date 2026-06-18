<script setup lang="ts">
// Методы нанесения (§5.5, аккордеон). Только то, что делает цех на старте.
// Шелкография/вышивка НЕ анонсируются до готовности.
const { t } = useI18n()
const icons = ['i-lucide-printer', 'i-lucide-layers', 'i-lucide-shirt']
const items = computed(() =>
  icons.map((icon, i) => ({
    icon,
    label: t(`landing.methods.items[${i}].label`),
    content: t(`landing.methods.items[${i}].content`),
  })),
)
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream">
    <div class="mx-auto max-w-(--container-max) px-4" style="padding-block: var(--section-pad)">
      <UiSectionLabel class="text-ink-cream/60">{{ $t('landing.methods.label') }}</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-8">{{ $t('landing.methods.title') }}</h2>
      <UAccordion :items="items" />
    </div>
  </section>
</template>
