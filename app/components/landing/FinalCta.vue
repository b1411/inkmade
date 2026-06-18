<script setup lang="ts">
// Финальный CTA (§5.10): крупная тёмная секция, один акцент-призыв перед футером.
const supabase = useSupabaseClient()
const { data: featured } = await useAsyncData('final-cta-featured', async () => {
  const { data } = await supabase
    .from('products')
    .select('alias')
    .eq('is_active', true)
    .not('alias', 'is', null)
    .limit(1)
    .maybeSingle()
  return data
})
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream relative overflow-hidden">
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-ink-burgundy/25 blur-3xl" />
    <div
      class="relative mx-auto max-w-(--container-max) px-4 text-center"
      style="padding-block: var(--section-pad)"
    >
      <h2 class="ink-hero text-hero">{{ $t('landing.finalCta.title') }}</h2>
      <p class="text-lead mt-5 text-ink-cream/80">{{ $t('landing.finalCta.subtitle') }}</p>
      <div class="mt-8 flex justify-center">
        <UiAppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
          {{ $t('landing.finalCta.cta') }}
        </UiAppButton>
      </div>
    </div>
  </section>
</template>
