<script setup lang="ts">
// Экран авторизации (§9.1): сильный брендовый split — слева бордовая панель с
// лого/слоганом/преимуществами (десктоп), справа форма на светлом. Без шапки/футера.
const { t } = useI18n()
const benefits = computed(() => [
  { icon: 'i-lucide-wand-2', text: t('auth.layout.benefitBuilder') },
  { icon: 'i-lucide-package', text: t('auth.layout.benefitPrint') },
  { icon: 'i-lucide-truck', text: t('auth.layout.benefitDelivery') },
])
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-ink-white text-ink-black">
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>
    <!-- брендовая панель (десктоп) -->
    <aside class="hidden lg:flex flex-col justify-between bg-ink-burgundy text-ink-cream p-12 ink-grain relative overflow-hidden">
      <!-- фоновый визуал (фото/петля) — под бордо-вуалью для читаемости текста.
           Обёртка absolute inset-0: UiMediaSlot имеет собственный `relative` + inline
           aspect-ratio (9/16), из-за чего при прямом `absolute` он оставался в потоке
           и раздувал панель. Здесь слот заполняет обёртку (w/h-full), ratio снят. -->
      <div class="absolute inset-0 z-0 opacity-45">
        <UiMediaSlot name="auth.visual" decorative rounded="rounded-none" ratio="" class="w-full h-full" />
      </div>
      <div class="absolute inset-0 z-0 bg-linear-to-t from-ink-burgundy via-ink-burgundy/85 to-ink-burgundy/55" />
      <!-- декоративные круги -->
      <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl z-0" />
      <div class="absolute -bottom-32 -left-16 size-80 rounded-full bg-ink-black/20 blur-3xl z-0" />

      <NuxtLink to="/" class="relative z-10 self-start">
        <img src="/logo-light.svg" alt="INKMADE" width="1275" height="146" class="h-5 w-auto">
      </NuxtLink>

      <div class="relative z-10">
        <h2 class="ink-display text-5xl leading-[1.05]">{{ $t('auth.layout.headline') }}</h2>
        <p class="text-ink-cream/75 mt-5 text-lead max-w-sm">
          {{ $t('auth.layout.tagline') }}
        </p>
        <ul class="mt-10 space-y-4">
          <li v-for="b in benefits" :key="b.text" class="flex items-center gap-3 text-ink-cream/85">
            <span class="size-9 rounded-full bg-ink-cream/10 flex items-center justify-center shrink-0">
              <UIcon :name="b.icon" class="size-4.5" />
            </span>
            {{ b.text }}
          </li>
        </ul>
      </div>

      <p class="ink-label text-ink-cream/50 relative z-10">{{ $t('auth.layout.footnote') }}</p>
    </aside>

    <!-- форма -->
    <main id="main-content" tabindex="-1" class="flex flex-col justify-center items-center px-6 py-10 sm:px-12 focus:outline-none">
      <div class="w-full max-w-sm">
        <NuxtLink to="/" class="lg:hidden block mb-10">
          <img src="/logo-dark.svg" alt="INKMADE" width="1275" height="146" class="h-4 w-auto">
        </NuxtLink>
        <slot />
      </div>
    </main>
  </div>
</template>
