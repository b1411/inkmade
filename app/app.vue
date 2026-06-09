<script setup lang="ts">
// Брендовые toast-уведомления (§4.4, §7.2) — vue-sonner поверх всего приложения.
// Рендерим только на клиенте. Стилизация под бренд — через CSS-переменные sonner
// в main.css; единый API — composables/useNotify.ts (B8).
import { Toaster } from 'vue-sonner'
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <Toaster position="bottom-right" :duration="4000" close-button />
    </ClientOnly>
  </UApp>
</template>
