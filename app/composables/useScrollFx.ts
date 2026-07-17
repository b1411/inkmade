import { onBeforeUnmount } from 'vue'
import { loadGsap } from '~/utils/gsap-loader'

// ─────────────────────────────────────────────────────────────────────────────
// Единый язык scroll-движения INKMADE поверх GSAP + ScrollTrigger (§8 ТЗ).
//
// Цель — чтобы анимации по всему сайту говорили на одном «фирменном» диалекте:
// одинаковые easing/длительности (из дизайн-токенов) и единый гейт reduced-motion.
// Каждый компонент создаёт один scope через `fx.scope(rootEl, gsap => { ... })`,
// внутри вызывает пресеты `reveal` / `parallax` / `float`. Cleanup автоматический.
// При reduced-motion / SSR / отсутствии GSAP — все эффекты no-op, контент виден.
// ─────────────────────────────────────────────────────────────────────────────

type Gsap = typeof import('gsap').gsap
type GsapTarget = gsap.TweenTarget

interface RevealOpts {
  /** Сдвиг по Y, px (по умолчанию 28). */
  y?: number
  /** Стартовый масштаб (1 = без масштабирования). */
  scale?: number
  /** Стартовое размытие, px (blur-in). */
  blur?: number
  /** Длительность, сек. */
  duration?: number
  /** Шаг каскада для нескольких целей, сек. */
  stagger?: number
  /** Порог ScrollTrigger (по умолчанию 'top 82%'). */
  start?: string
}

interface ParallaxOpts {
  /** Сдвиг по Y в процентах за прокрутку секции (минус = вверх). */
  y?: number
  /** Сдвиг по X, %. */
  x?: number
}

export interface ScrollFx {
  /** true, если движение разрешено (клиент + не reduced + GSAP доступен). */
  enabled: boolean
  /** Регистрирует scope анимаций с привязкой к корню и авто-cleanup. */
  scope: (root: HTMLElement, build: (gsap: Gsap, reveal: RevealFn, parallax: ParallaxFn, float: FloatFn) => void) => void
}

type RevealFn = (targets: GsapTarget, opts?: RevealOpts) => void
type ParallaxFn = (targets: GsapTarget, trigger: HTMLElement, opts?: ParallaxOpts) => void
type FloatFn = (targets: GsapTarget, opts?: { y?: number; duration?: number }) => void

// Фирменные easing (зеркало токенов из main.css §2.4).
const EASE_OUT = 'power3.out'
const EASE_NONE = 'none'

export function useScrollFx(): ScrollFx {
  const prefersReduced = useReducedMotion()
  const enabled = Boolean(import.meta.client && !prefersReduced.value)

  let ctx: { revert: () => void } | null = null
  let disposed = false
  onBeforeUnmount(() => {
    disposed = true
    ctx?.revert()
  })

  function scope(root: HTMLElement, build: Parameters<ScrollFx['scope']>[1]): void {
    if (!enabled || !root) return
    void loadGsap().then(({ gsap }) => {
      if (disposed || !root.isConnected) return

      const reveal: RevealFn = (targets, opts = {}) => {
        const { y = 28, scale = 1, blur = 0, duration = 0.8, stagger = 0.08, start = 'top 82%' } = opts
        gsap.from(targets, {
          opacity: 0,
          y,
          scale,
          filter: blur ? `blur(${blur}px)` : undefined,
          duration,
          stagger,
          ease: EASE_OUT,
          scrollTrigger: { trigger: root, start },
        })
      }

      const parallax: ParallaxFn = (targets, trigger, opts = {}) => {
        const { y = -10, x = 0 } = opts
        gsap.to(targets, {
          yPercent: y,
          xPercent: x,
          ease: EASE_NONE,
          scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      }

      const float: FloatFn = (targets, opts = {}) => {
        const { y = 12, duration = 3.2 } = opts
        gsap.to(targets, {
          y: `+=${y}`,
          duration,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.4, from: 'random' },
        })
      }

      ctx = gsap.context(() => build(gsap, reveal, parallax, float), root)
    })
  }

  return { enabled, scope }
}
