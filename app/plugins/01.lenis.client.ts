import Lenis from 'lenis'

/**
 * Инерционный плавный скролл (§3.1 ТЗ) — ставится первым, максимальный эффект
 * за минимум усилий. Владеет собственным rAF-циклом; GSAP-плагин (02) лишь
 * слушает прокрутку для синхронизации ScrollTrigger.
 *
 * Гейт: при системном `prefers-reduced-motion: reduce` Lenis не инициализируется
 * вовсе — нативный скролл, инстанс не предоставляется (потребители проверяют null).
 */
export default defineNuxtPlugin(() => {
  let lenis: Lenis | null = null

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    const instance = lenis
    function raf(time: number) {
      instance.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }

  return { provide: { lenis } }
})
