import type { Directive } from 'vue'
import { loadGsap } from '~/utils/gsap-loader'

/**
 * Директива v-reveal-text — киношное появление заголовка по строкам: каждая строка
 * «выезжает» снизу из-под маски при входе в вьюпорт. Главный визуальный маркер
 * «дорогого» сайта. Использует SplitText (бесплатен с GSAP 3.13+).
 *
 * Универсальный плагин (не .client): директива должна резолвиться и на SSR.
 * Вся работа — в mounted (клиент), поэтому доступ к window/document безопасен.
 * Гейт reduced-motion: ничего не делаем, текст остаётся видимым.
 *
 * Смена локали (i18n) меняет текст узла — поэтому на заголовок ставим :key="locale",
 * чтобы Vue перемонтировал элемент и split пересобрался под новый текст.
 */
export default defineNuxtPlugin((nuxtApp) => {
  interface RevealState { revert: () => void }

  const revealText: Directive<HTMLElement & { __rt?: RevealState }> = {
    async mounted(el) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      // дождаться загрузки шрифтов — иначе строки разобьются по системному шрифту
      try {
        await document.fonts?.ready
      }
      catch {
        // noop — продолжаем с тем, что есть
      }
      const { gsap, SplitText } = await loadGsap()
      if (!el.isConnected) return

      const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'rt-line' })
      const tween = gsap.from(split.lines, {
        yPercent: 120,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      })

      el.__rt = {
        revert() {
          const st = tween.scrollTrigger as { kill: () => void } | undefined
          st?.kill()
          tween.kill()
          split.revert()
        },
      }
    },
    unmounted(el) {
      el.__rt?.revert()
    },
  }

  nuxtApp.vueApp.directive('reveal-text', revealText)
})
