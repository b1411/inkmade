<script setup lang="ts">
// Блок дизайнеров (§5.8) — тизер опоры №2. Тёмная акцентная секция, призыв
// для творцов. На старте CTA ведёт в каталог дизайнеров / сбор заявок.
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-burgundy text-ink-cream relative overflow-hidden">
    <div class="absolute -bottom-24 -right-16 size-80 rounded-full bg-ink-black/30 blur-3xl" />
    <div
      class="relative mx-auto max-w-(--container-max) px-4 grid lg:grid-cols-2 gap-8 items-center"
      style="padding-block: var(--section-pad)"
    >
      <div>
        <UiSectionLabel class="text-ink-cream/60">{{ $t('landing.designers.label') }}</UiSectionLabel>
        <h2 class="ink-display text-h1 mt-3">{{ $t('landing.designers.titleLine1') }}<br>{{ $t('landing.designers.titleLine2') }}</h2>
        <p class="text-lead mt-5 max-w-xl text-ink-cream/85">
          {{ $t('landing.designers.text') }}
        </p>
        <div class="mt-8">
          <UiAppButton to="/login" variant="primary" size="lg" on-dark>
            {{ $t('landing.designers.cta') }}
          </UiAppButton>
        </div>
      </div>
      <div class="hidden lg:flex justify-center">
        <UIcon name="i-lucide-palette" class="size-48 text-ink-cream/15" />
      </div>
    </div>
  </section>
</template>
