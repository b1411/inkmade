<script setup lang="ts">
// INK SYSTEM · штамп MADE IN ALMATY (спека §36.2). Требование §47: «MADE IN ALMATY
// stamp подготовлен как компонент» — он должен одинаково лечь и на сайт, и на
// hangtag, и на упаковку, поэтому это отдельный примитив, а не вёрстка в футере.
//
// Литерал, не i18n: клеймо происхождения не переводится (как MADE IN ITALY).
//
// Рамка — тонкая техническая, в языке print-zone frame (§36.2): 1px, прямые углы.
// Не бордо: §3.3 держит акцент под CTA, а клеймо не действие.
withDefaults(defineProps<{ boxed?: boolean }>(), { boxed: true })
</script>

<template>
  <div
    class="inline-block"
    :class="boxed ? 'border border-[var(--ink-line-strong)] px-3 py-2' : ''"
  >
    <p class="ink-label leading-relaxed text-ink-text-muted">
      MADE IN ALMATY<br >
      DESIGNED WITH INKMADE
    </p>
  </div>
</template>

