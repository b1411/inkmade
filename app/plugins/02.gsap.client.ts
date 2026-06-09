import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

/**
 * GSAP + ScrollTrigger (§3.1 ТЗ). Регистрирует плагин и синхронизирует
 * ScrollTrigger с Lenis: при каждой прокрутке Lenis обновляем триггеры,
 * чтобы scroll-анимации (draw-линия, параллакс, count-up) шли в синхроне
 * с инерционным скроллом.
 *
 * Гейт reduced-motion обрабатывается на уровне самих анимаций (через
 * useReducedMotion); здесь только инфраструктура. Если Lenis отключён
 * (reduced-motion), ScrollTrigger работает с нативным скроллом.
 */
export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)

  const lenis = nuxtApp.$lenis as Lenis | null
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update)
  }

  return { provide: { gsap, ScrollTrigger } }
})
