<script setup lang="ts">
// Экран авторизации (§9.1): сильный брендовый split — слева бордовая панель с
// лого/слоганом/преимуществами (десктоп), справа форма на светлом. Без шапки/футера.
const { t } = useI18n()
const route = useRoute()
const { locale } = useI18n()
const isBusinessFlow = computed(() => safeRedirectPath(route.query.redirect)?.startsWith('/shop') ?? false)
const copy = computed(() => {
  if (!isBusinessFlow.value) {
    return {
      headline: t('auth.layout.headline'),
      tagline: t('auth.layout.tagline'),
      footnote: t('auth.layout.footnote'),
    }
  }
  return locale.value === 'kk'
    ? { headline: 'Мерч-дүкеніңді аш.', tagline: 'Қоймасыз және бастапқы шығынсыз өз брендіңе арналған витрина.', footnote: 'INKMADE / BUSINESS' }
    : { headline: 'Открой свой мерч-магазин.', tagline: 'Фирменная витрина без склада, вложений и ручной обработки заказов.', footnote: 'INKMADE / BUSINESS' }
})
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
    <aside class="hidden lg:flex flex-col justify-between bg-ink-black text-ink-cream p-12 ink-grain relative overflow-hidden">
      <!-- фоновый визуал (фото/петля) — под бордо-вуалью для читаемости текста.
           Обёртка absolute inset-0: UiMediaSlot имеет собственный `relative` + inline
           aspect-ratio (9/16), из-за чего при прямом `absolute` он оставался в потоке
           и раздувал панель. Здесь слот заполняет обёртку (w/h-full), ratio снят. -->
      <div class="absolute inset-0 z-0 opacity-80">
        <UiMediaSlot name="auth.visual" decorative rounded="rounded-none" ratio="" class="w-full h-full" />
      </div>
      <div class="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(8,11,13,.4)_0%,rgba(8,11,13,.62)_45%,rgba(72,21,29,.94)_100%)]" />
      <!-- декоративные круги -->
      <div class="absolute -top-24 -right-24 size-96 rounded-full bg-ink-burgundy-light/30 blur-3xl z-0" />
      <div class="absolute -bottom-32 -left-16 size-80 rounded-full bg-ink-black/20 blur-3xl z-0" />

      <NuxtLink to="/" class="relative z-10 self-start">
        <img src="/logo-light.svg" alt="INKMADE" width="1275" height="146" class="h-5 w-auto">
      </NuxtLink>

      <div class="relative z-10">
        <UiSectionLabel inverse>{{ isBusinessFlow ? 'B2B / STORE' : 'INKMADE / ACCESS' }}</UiSectionLabel>
        <h2 class="ink-display mt-4 max-w-[10ch] text-5xl leading-[.95]">{{ copy.headline }}</h2>
        <p class="text-ink-cream/75 mt-5 text-lead max-w-sm">
          {{ copy.tagline }}
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

      <p class="ink-label text-ink-cream/50 relative z-10">{{ copy.footnote }}</p>
    </aside>

    <!-- форма -->
    <main id="main-content" tabindex="-1" class="relative flex flex-col justify-center items-center px-6 py-10 sm:px-12 focus:outline-none">
      <NuxtLink to="/" class="absolute right-6 top-6 hidden items-center gap-2 text-caption font-semibold text-ink-gray-600 transition-colors hover:text-ink-burgundy sm:inline-flex">
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ $t('actions.back') }}
      </NuxtLink>
      <div class="w-full max-w-sm">
        <NuxtLink to="/" class="lg:hidden block mb-10">
          <img src="/logo-dark.svg" alt="INKMADE" width="1275" height="146" class="h-4 w-auto">
        </NuxtLink>
        <slot />
      </div>
    </main>
  </div>
</template>
