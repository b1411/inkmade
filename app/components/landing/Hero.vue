<script setup lang="ts">
// Hero (§6): тёмный бордо-фон, граффити H1, CTA ведёт В КОНСТРУКТОР (не в форму заявки).
// «Создать принт» — сразу в конструктор первого доступного товара; иначе в каталог.
const supabase = useSupabaseClient()
const { data: featured } = await useAsyncData('hero-featured', async () => {
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
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden">
    <!-- декор: брызги/потёки бренда -->
    <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl" />
    <div class="absolute -bottom-32 -left-20 size-80 rounded-full bg-ink-black/30 blur-3xl" />

    <div class="relative mx-auto max-w-(--container-max) px-4 py-24 md:py-32">
      <p class="ink-label text-ink-cream/70">Merch Studio · EST. 2025</p>
      <h1 class="ink-hero text-hero mt-4 max-w-4xl">
        ТВОЙ ПРИНТ.<br>ТВОЯ ВЕЩЬ.
      </h1>
      <p class="text-body-lg mt-6 max-w-xl text-ink-cream/85">
        Выбери изделие, нанеси принт прямо в браузере, увидь цену сразу и оплати онлайн.
        Печать по требованию — тираж от одной штуки.
      </p>
      <div class="flex flex-wrap gap-3 mt-8">
        <AppButton :to="createTo" variant="primary" size="xl" on-dark magnetic>
          Создать свой принт
        </AppButton>
        <AppButton to="/catalog" variant="secondary" size="xl" on-dark>
          Смотреть каталог
        </AppButton>
      </div>
    </div>
  </section>
</template>
