<script setup lang="ts">
// Единая кнопка бренда (§4.2). Кастомный элемент (не UButton) — полный контроль
// над визуалом без борьбы со специфичностью Nuxt UI. Варианты primary/secondary/ghost,
// магнитный hover на главных CTA (§4.2), тач-цель ≥44px, focus-ring.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  magnetic?: boolean
  block?: boolean
  onDark?: boolean
  to?: string
  icon?: string
  trailingIcon?: string
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'lg',
  magnetic: false,
  block: false,
  onDark: false,
  type: 'button',
})

const sizeClass = computed(
  () =>
    ({
      sm: 'px-4 text-sm',
      md: 'px-5 text-sm',
      lg: 'px-6 text-base',
      xl: 'px-8 py-4 text-lg',
    })[props.size],
)

const btnClass = computed(() => [
  'app-btn',
  `app-btn--${props.variant}`,
  sizeClass.value,
  props.onDark ? 'on-dark' : '',
  props.block ? 'w-full' : '',
])

// ── Магнитный эффект (§4.2): притяжение к курсору, гейт reduce + только pointer:fine ──
const wrap = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
let teardown: (() => void) | null = null

onMounted(() => {
  if (!props.magnetic || prefersReduced.value) return
  if (!window.matchMedia('(pointer: fine)').matches) return

  const node = wrap.value
  const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
  if (!node || !gsap) return

  const radius = 60
  const strength = 0.35

  function onMove(e: MouseEvent) {
    const rect = node!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    if (Math.hypot(dx, dy) < rect.width / 2 + radius) {
      gsap!.to(node, { x: dx * strength, y: dy * strength, duration: 0.4, ease: 'power3.out' })
    } else {
      gsap!.to(node, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    }
  }
  function reset() {
    gsap!.to(node, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
  }

  window.addEventListener('mousemove', onMove, { passive: true })
  node.addEventListener('mouseleave', reset)
  teardown = () => {
    window.removeEventListener('mousemove', onMove)
    node.removeEventListener('mouseleave', reset)
  }
})
onBeforeUnmount(() => teardown?.())
</script>

<template>
  <span ref="wrap" class="inline-flex" :class="block ? 'w-full' : ''">
    <component
      :is="to ? 'NuxtLink' : 'button'"
      :to="to || undefined"
      :type="to ? undefined : type"
      :disabled="!to && (disabled || loading) ? true : undefined"
      :aria-disabled="to && disabled ? 'true' : undefined"
      :class="btnClass"
    >
      <UIcon v-if="loading" name="i-lucide-loader-2" class="size-5 animate-spin" />
      <UIcon v-else-if="icon" :name="icon" class="size-5" />
      <span v-if="$slots.default"><slot /></span>
      <UIcon v-if="trailingIcon && !loading" :name="trailingIcon" class="size-5" />
    </component>
  </span>
</template>
