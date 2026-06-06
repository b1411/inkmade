<script setup lang="ts">
// Hero (§6): тёмный бордо-фон, граффити H1, CTA ведёт В КОНСТРУКТОР/каталог (не в форму заявки).
</script>

<template>
  <section class="w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden">
    <!-- декор: брызги/потёки бренда -->
    <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl" />
    <div class="absolute -bottom-32 -left-20 size-80 rounded-full bg-ink-black/30 blur-3xl" />

    <div class="relative mx-auto max-w-(--container-max) px-4 py-24 md:py-32">
      <p class="ink-label text-ink-cream/70">Merch Studio · EST. 2025</p>
      <h1 class="ink-display text-h1 mt-4 max-w-4xl">
        ТВОЙ ПРИНТ.<br>ТВОЯ ВЕЩЬ.
      </h1>
      <p class="text-body-lg mt-6 max-w-xl text-ink-cream/85">
        Выбери изделие, нанеси принт прямо в браузере, увидь цену сразу и оплати онлайн.
        Печать по требованию — тираж от одной штуки.
      </p>
      <div class="flex flex-wrap gap-3 mt-8">
        <UButton to="/catalog" size="xl" color="neutral" class="bg-ink-cream text-ink-black hover:bg-ink-cream-dark">
          Создать свой принт
        </UButton>
        <UButton to="/catalog" size="xl" color="neutral" variant="outline" class="text-ink-cream ring-ink-cream/40">
          Смотреть каталог
        </UButton>
      </div>
    </div>
  </section>
</template>
