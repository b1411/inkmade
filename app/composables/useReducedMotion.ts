import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, type ComputedRef } from 'vue'

/**
 * Единый гейт движения (§11, §3.4 ТЗ). Реактивно отражает системную настройку
 * `prefers-reduced-motion`. Каждый JS-эффект (GSAP, count-up, магнит,
 * курсор, 3D) импортирует этот флаг и раньше выходит при `true`.
 *
 * CSS-гейт (отключение transition/animation/scroll) уже глобально в main.css —
 * этот composable нужен для эффектов, которые управляются из JS, а не из CSS.
 *
 * SSR-безопасен: до гидрации возвращает `false` (движение по умолчанию включено,
 * затем клиент уточняет реальное значение).
 */
export function useReducedMotion(): ComputedRef<boolean> {
  const preference = usePreferredReducedMotion()
  return computed(() => preference.value === 'reduce')
}
