import type { Directive } from 'vue'
import type { gsap as GsapType } from 'gsap'

/**
 * Директива v-magnetic (§4.1, §4.2 ТЗ) — элемент слегка тянется к курсору, пока
 * под ним. Локальный mousemove на самом элементе (срабатывает только при наведении),
 * поэтому дёшев и масштабируется на много пунктов навигации.
 *
 * Гейт: не активируется при prefers-reduced-motion и на тач-устройствах (pointer:coarse).
 * Значение биндинга — сила притяжения (0..1, по умолчанию 0.4).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const gsap = nuxtApp.$gsap as typeof GsapType | undefined
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = window.matchMedia('(pointer: fine)').matches

  interface MagHandlers {
    move: (e: MouseEvent) => void
    leave: () => void
  }

  const magnetic: Directive<HTMLElement & { __mag?: MagHandlers }, number | undefined> = {
    mounted(el, binding) {
      if (reduced || !fine || !gsap) return
      const strength = binding.value ?? 0.4

      const move = (e: MouseEvent) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.3, ease: 'power3.out' })
      }
      const leave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      }

      el.addEventListener('mousemove', move, { passive: true })
      el.addEventListener('mouseleave', leave)
      el.__mag = { move, leave }
    },
    unmounted(el) {
      if (el.__mag) {
        el.removeEventListener('mousemove', el.__mag.move)
        el.removeEventListener('mouseleave', el.__mag.leave)
      }
    },
  }

  nuxtApp.vueApp.directive('magnetic', magnetic)
})
