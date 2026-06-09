<script setup lang="ts">
// Публичный layout (лендинг/каталог), §4. Фикс-хедер (прозрачный над hero лендинга,
// стекло при скролле) + тёмный футер. На лендинге hero full-bleed уходит под хедер;
// на внутренних страницах main получает верхний отступ под фикс-хедер.
const route = useRoute()
const isLanding = computed(() => route.path === '/')
</script>

<template>
  <div class="min-h-screen flex flex-col bg-ink-white text-ink-black">
    <LayoutAppHeader />

    <main
      class="flex-1 mx-auto w-full max-w-(--container-max) px-4 pb-8"
      :class="isLanding ? 'pt-0' : 'pt-20'"
    >
      <slot />
    </main>

    <LayoutAppFooter />
  </div>
</template>
