import { INK_CANVAS } from '~~/shared/config/ink-system'

// «Улетающее в корзину» превью (§6.3, §9.2). Клонирует снимок композиции и
// анимирует его полёт к иконке корзины в шапке ([data-cart-icon]). Бейдж корзины
// «отскакивает» сам (AppHeader следит за количеством). Гейт reduced-motion.
export function useFlyToCart() {
  const prefersReduced = useReducedMotion()

  function fly(source: HTMLElement | null, imageUrl?: string) {
    if (prefersReduced.value || !source || !import.meta.client) return
    const target = document.querySelector('[data-cart-icon]') as HTMLElement | null
    const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
    if (!target || !gsap) return

    const s = source.getBoundingClientRect()
    const t = target.getBoundingClientRect()

    const clone = document.createElement('div')
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${s.left + s.width / 2 - 30}px`,
      top: `${s.top + s.height / 2 - 30}px`,
      width: '60px',
      height: '60px',
      borderRadius: '14px',
      overflow: 'hidden',
      zIndex: '9999',
      pointerEvents: 'none',
      // RGB Ink Black (§3.1); было 17,17,17 от прежнего чёрного.
      boxShadow: '0 8px 24px rgba(8,11,13,0.3)',
      background: imageUrl ? `center/cover no-repeat url(${imageUrl})` : INK_CANVAS.burgundy,
    })
    document.body.appendChild(clone)

    const dx = t.left + t.width / 2 - (s.left + s.width / 2)
    const dy = t.top + t.height / 2 - (s.top + s.height / 2)

    gsap.to(clone, {
      x: dx,
      y: dy,
      scale: 0.18,
      opacity: 0.5,
      duration: 0.8,
      ease: 'power2.in',
      onComplete: () => clone.remove(),
    })
  }

  return { fly }
}
