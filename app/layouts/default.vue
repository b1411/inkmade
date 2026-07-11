<script setup lang="ts">
// Публичный layout (лендинг/каталог), §4. Фикс-хедер (прозрачный над hero лендинга,
// стекло при скролле) + тёмный футер. На лендинге hero full-bleed уходит под хедер;
// на внутренних страницах main получает верхний отступ под фикс-хедер.
const route = useRoute()
const isLanding = computed(() => route.path === '/')
</script>

<template>
  <!-- overflow-x-clip: full-bleed секции используют w-screen (=100vw, включает ширину
       вертикального скроллбара) → без клипа выезжают на ~15px и дают горизонтальный
       скролл. clip обрезает лишний overhang фоновых полос, не создавая scroll-контейнер
       (fixed-хедер и вертикальный скролл не затронуты; контент — в центрированном max-w). -->
  <div class="min-h-screen flex flex-col bg-ink-white text-ink-black overflow-x-clip">
    <!-- Skip-to-content (a11y): первый фокусируемый элемент, виден только с клавиатуры -->
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>
    <LayoutAppHeader />

    <main
      id="main-content"
      tabindex="-1"
      class="flex-1 mx-auto w-full max-w-(--container-max) px-4 pb-8 focus:outline-none"
      :class="isLanding ? 'pt-0' : 'pt-20'"
    >
      <slot />
    </main>

    <LayoutAppFooter />

    <UiCustomCursor />
  </div>
</template>
