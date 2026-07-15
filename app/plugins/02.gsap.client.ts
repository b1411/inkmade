import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/**
 * GSAP + ScrollTrigger + SplitText. SplitText бесплатен с GSAP 3.13+ и даёт
 * построчное появление заголовков (директива v-reveal-text).
 *
 * Скролл — нативный. Инерционный Lenis снят: спека §21 прямо запрещает
 * smooth-scroll-библиотеку на весь сайт (перехват колеса ломает ожидание
 * скорости, поиск по странице и доступность). ScrollTrigger работает с
 * нативным скроллом — это был штатный путь при reduced-motion, теперь единственный.
 *
 * Гейт reduced-motion обрабатывается на уровне самих анимаций (useReducedMotion);
 * здесь только инфраструктура.
 */
export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  return { provide: { gsap, ScrollTrigger } }
})
