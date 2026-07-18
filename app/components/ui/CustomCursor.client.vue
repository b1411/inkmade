<script setup lang="ts">
// Кастомный курсор (§4.6, §5 вау) — два слоя для «дорогого» ощущения: быстрая точка
// точно под курсором + мягко догоняющее кольцо (лаг). Кольцо увеличивается над
// интерактивным. Нативный курсор НЕ прячем (безопаснее для UX). Только десктоп
// (pointer:fine) и при включённом движении.
const ring = ref<HTMLElement | null>(null)
const dot = ref<HTMLElement | null>(null)
const active = ref(false)
const visible = ref(false)
const enabled = ref(false)
let teardown: (() => void) | null = null
let frame = 0

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = window.matchMedia('(pointer: fine)').matches
  if (reduced || !fine) return

  const ringEl = ring.value
  const dotEl = dot.value
  if (!ringEl || !dotEl) return
  enabled.value = true

  // Кольцо догоняет с лагом, точка — почти мгновенно (контраст = премиум-ощущение).
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  const tick = () => {
    currentX += (targetX - currentX) * 0.18
    currentY += (targetY - currentY) * 0.18
    ringEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)

  const interactiveSel = 'a,button,[role="button"],input,select,textarea,label,[data-cursor]'
  const onMove = (e: MouseEvent) => {
    visible.value = true
    targetX = e.clientX
    targetY = e.clientY
    dotEl.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    active.value = !!(e.target as HTMLElement)?.closest?.(interactiveSel)
  }
  const onLeave = () => (visible.value = false)

  window.addEventListener('mousemove', onMove, { passive: true })
  document.addEventListener('mouseleave', onLeave)
  teardown = () => {
    window.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseleave', onLeave)
    cancelAnimationFrame(frame)
  }
})
onBeforeUnmount(() => teardown?.())
</script>

<template>
  <div v-if="enabled" aria-hidden="true">
    <!-- Догоняющее кольцо -->
    <div ref="ring" class="ink-cursor">
      <span class="ink-cursor__ring" :class="{ 'is-active': active, 'is-visible': visible }" />
    </div>
    <!-- Быстрая точка -->
    <div ref="dot" class="ink-cursor">
      <span class="ink-cursor__dot" :class="{ 'is-active': active, 'is-visible': visible }" />
    </div>
  </div>
</template>

<style scoped>
/* Внешний слой — позиционируется requestAnimationFrame-lerp'ом через transform: translate (x/y) */
.ink-cursor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9998;
  will-change: transform;
}
/* Кольцо — визуал и scale (CSS не конфликтует с JS-translate внешнего слоя) */
.ink-cursor__ring {
  display: block;
  width: 30px;
  height: 30px;
  margin: -15px 0 0 -15px;
  border: 1.5px solid var(--color-ink-burgundy);
  border-radius: 9999px;
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out),
    transform var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.ink-cursor__ring.is-visible {
  opacity: 1;
}
.ink-cursor__ring.is-active {
  transform: scale(1.7);
  background-color: rgba(122, 31, 40, 0.12);
}
/* Точка — маленький залитый центр */
.ink-cursor__dot {
  display: block;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  background: var(--color-ink-burgundy);
  border-radius: 9999px;
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}
.ink-cursor__dot.is-visible {
  opacity: 1;
}
/* Над интерактивным точка сжимается — кольцо «забирает» акцент */
.ink-cursor__dot.is-active {
  transform: scale(0.4);
}
</style>
