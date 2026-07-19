<script setup lang="ts">
// Баннер согласия на cookie/трекинг (opt-in). .client-компонент: только браузер,
// без SSR-гидрации. Пиксели грузятся лишь после «Принять» (см. analytics.client.ts).
const { decided, load, accept, reject } = useConsent()
// setup выполняется на клиенте (.client.vue) — читаем сохранённый выбор до первой
// отрисовки, чтобы вернувшемуся пользователю баннер не мигал.
load()
const visible = computed(() => !decided.value)
</script>

<template>
  <Transition name="cookie-slide">
    <div
      v-if="visible"
      class="fixed inset-x-3 bottom-3 z-50 ml-auto ink-grain bg-ink-black text-ink-cream/85 border border-white/10 shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[min(430px,calc(100vw-40px))]"
      role="dialog"
      aria-live="polite"
      :aria-label="$t('cookie.title')"
    >
      <div class="px-4 py-4 flex flex-col gap-3">
        <div class="flex-1 space-y-1">
          <p class="font-semibold text-ink-cream">{{ $t('cookie.title') }}</p>
          <p class="text-caption text-ink-cream/70">
            {{ $t('cookie.text') }}
            <NuxtLink to="/legal/cookies" class="underline hover:text-ink-cream">{{ $t('cookie.more') }}</NuxtLink>
          </p>
        </div>
        <div class="flex items-center justify-end gap-2 shrink-0">
          <UButton size="sm" color="neutral" variant="ghost" class="text-ink-cream/80 hover:text-ink-cream" @click="reject">
            {{ $t('cookie.reject') }}
          </UButton>
          <UButton size="sm" color="primary" @click="accept">
            {{ $t('cookie.accept') }}
          </UButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-slide-enter-active,
.cookie-slide-leave-active {
  transition: transform var(--dur-base, 0.3s) var(--ease-out, ease), opacity var(--dur-base, 0.3s) var(--ease-out, ease);
}
.cookie-slide-enter-from,
.cookie-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
