<script setup lang="ts">
// Верхняя инфо-полоса — спека §8. Блок 1 структуры главной (§7).
//
// Поведение по §8: полоса НЕ sticky, при скролле уходит вверх, и только после
// этого шапка встаёт на top: 0. Полоса лежит в обычном потоке, а шапка у нас
// fixed — поэтому смещение шапки считает AppHeader (top = max(0, 28 - scrollY)),
// см. TOP_BAR_H там же. Высота продублирована как константа, а не «28» в двух
// местах: рассинхрон дал бы либо щель с hero над шапкой, либо перекрытие полосы.
//
// Текст сокращаем ниже 360px: полная строка там переносится на две и ломает
// высоту 28px (§8). Порог — CSS-медиазапрос, без JS: полоса рендерится в SSR.
</script>

<template>
  <div
    class="w-full text-center select-none"
    style="background: var(--ink-topbar-gradient)"
  >
    <p class="ink-label top-bar-text text-ink-bone/90">
      <span class="top-bar-full">{{ $t('topBar.full') }}</span>
      <span class="top-bar-short">{{ $t('topBar.short') }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Высота 28–30px и кегль 10px (§8). .ink-label даёт mono + uppercase + трекинг,
   здесь только размер и вертикальный ритм. */
.top-bar-text {
  height: 30px;
  line-height: 30px;
  font-size: 10px;
}

.top-bar-short {
  display: none;
}

@media (max-width: 767px) {
  .top-bar-text {
    height: 28px;
    line-height: 28px;
    font-size: 9px;
  }
}

@media (max-width: 359px) {
  .top-bar-full {
    display: none;
  }
  .top-bar-short {
    display: inline;
  }
}
</style>

