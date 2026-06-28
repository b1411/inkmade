<script setup lang="ts">
// Финальный CTA (§5.10): крупная тёмная секция, один акцент-призыв перед футером.
// Чистая композиция: ambient-фон + контент по reveal, без декоративных мокапов.
const { locale } = useI18n()
const supabase = useSupabaseClient()
const { data: featured } = await useAsyncData('final-cta-featured', async () => {
  const { data } = await supabase
    .from('products')
    .select('alias')
    .eq('is_active', true)
    .not('alias', 'is', null)
    .order('is_featured', { ascending: false }) // витринный товар-герой первым (миграция 0050)
    .limit(1)
    .maybeSingle()
  return data
})
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream relative overflow-hidden">
    <div class="absolute inset-0 m-auto size-[40rem] rounded-full bg-ink-burgundy/25 blur-3xl ink-ambient-a" />

    <div
      class="relative mx-auto max-w-(--container-max) px-4 text-center"
      style="padding-block: var(--section-pad)"
    >
      <UiReveal>
        <h2 :key="locale" v-reveal-text class="ink-hero text-hero">{{ $t('landing.finalCta.title') }}</h2>
        <p class="text-lead mt-5 text-ink-cream/80">{{ $t('landing.finalCta.subtitle') }}</p>
        <div class="mt-8 flex justify-center">
          <UiAppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
            {{ $t('landing.finalCta.cta') }}
          </UiAppButton>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
