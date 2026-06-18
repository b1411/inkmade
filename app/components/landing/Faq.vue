<script setup lang="ts">
// FAQ (§5.9): оплата, доставка, сроки, возвраты, расхождение цвета.
const { t } = useI18n()
const items = computed(() =>
  [0, 1, 2, 3, 4].map(i => ({
    label: t(`landing.faq.items[${i}].label`),
    content: t(`landing.faq.items[${i}].content`),
  })),
)
</script>

<template>
  <section aria-labelledby="faq-heading">
    <UiSectionLabel accent>{{ $t('landing.faq.label') }}</UiSectionLabel>
    <h2 id="faq-heading" class="ink-display text-h2 mt-2 mb-8">{{ $t('landing.faq.title') }}</h2>
    <UAccordion :items="items" />
  </section>
</template>
