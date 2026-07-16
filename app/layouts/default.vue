<script setup lang="ts">
// Публичный layout (лендинг/каталог). Среда — Ink Black (спека §3.3: body, header,
// hero, footer). Фикс-хедер + тёмный футер. На лендинге hero full-bleed уходит под
// хедер; на внутренних страницах main получает верхний отступ под фикс-хедер.
//
// Тёмные маршруты — §3.3: Ink Black это «фон страницы каталога и карточки товара»
// (и лендинга). Список белый, а не чёрный: страницы, которых тут нет, едут на
// светлом Paper — так новая страница по умолчанию не окажется тёмным текстом по
// тёмному, а попадёт в тёмное осознанно.
//
// Светлыми остаются корзина, оформление и юр.документы — и это не долг, а спека:
// §3.3 сам отдаёт Paper под «checkout summary» и «юридические документы».
const route = useRoute()
const DARK_ROUTES = [/^\/$/, /^\/catalog(\/|$)/, /^\/product(\/|$)/]
const isDark = computed(() => DARK_ROUTES.some(re => re.test(route.path)))
// Лендинг сам рисует hero под шапку, остальным тёмным нужен отступ под фикс-шапку.
const isLanding = computed(() => route.path === '/')
</script>

<template>
  <!-- overflow-x-clip: full-bleed секции используют w-screen (=100vw, включает ширину
       вертикального скроллбара) → без клипа выезжают на ~15px и дают горизонтальный
       скролл. clip обрезает лишний overhang фоновых полос, не создавая scroll-контейнер
       (fixed-хедер и вертикальный скролл не затронуты; контент — в центрированном max-w). -->
  <div class="min-h-screen flex flex-col bg-ink-black text-ink-text overflow-x-clip">
    <!-- Skip-to-content (a11y): первый фокусируемый элемент, виден только с клавиатуры -->
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>

    <!-- Блок 1 структуры (§7). В обычном потоке и НЕ sticky — по §8 полоса уходит
         вверх при скролле, а шапка (fixed) сама съезжает на top: 0 вслед за ней. -->
    <LayoutTopInfoBar />
    <LayoutAppHeader />

    <!-- Светлая полоса — full-bleed, а не по ширине контейнера: иначе Paper шёл бы
         колонкой с тёмными «рельсами» по бокам. -->
    <div
      class="flex-1 flex flex-col"
      :class="isDark ? '' : 'bg-ink-paper text-ink-text-dark'"
    >
      <main
        id="main-content"
        tabindex="-1"
        class="flex-1 mx-auto w-full max-w-(--container-max) px-4 pb-8 focus:outline-none"
        :class="isLanding ? 'pt-0' : 'pt-20'"
      >
        <slot />
      </main>
    </div>

    <LayoutAppFooter />

    <UiCustomCursor />
  </div>
</template>
