import type { Directive } from 'vue'

/**
 * Директива v-magnetic (§4.1, §4.2 ТЗ) — элемент слегка тянется к курсору, пока
 * под ним. Локальный mousemove на самом элементе (срабатывает только при наведении),
 * поэтому дёшев и масштабируется на много пунктов навигации.
 *
 * Универсальный плагин (не .client): директива должна резолвиться и на SSR, иначе
 * Vue падает на getSSRProps. Вся работа — только в mounted (выполняется на клиенте);
 * доступ к window/gsap там безопасен. Значение биндинга — сила притяжения (0..1).
 */
export default defineNuxtPlugin((nuxtApp) => {
  interface MagHandlers {
    move: (e: MouseEvent) => void
    leave: () => void
  }

  const magnetic: Directive<HTMLElement & { __mag?: MagHandlers }, number | undefined> = {
    mounted(el, binding) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const fine = window.matchMedia('(pointer: fine)').matches
      if (reduced || !fine) return

      const strength = binding.value ?? 0.4

      const move = (e: MouseEvent) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        el.style.transition = 'transform 300ms cubic-bezier(.22,1,.36,1)'
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
      }
      const leave = () => {
        el.style.transition = 'transform 500ms cubic-bezier(.34,1.56,.64,1)'
        el.style.transform = 'translate3d(0, 0, 0)'
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
