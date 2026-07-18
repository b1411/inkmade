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
const emit = defineEmits<{ click: [MouseEvent] }>()

// Явный контракт клика: раньше @click держался ТОЛЬКО на attribute-fallthrough к корневому
// <span> + всплытии — смена inheritAttrs / второй корневой узел молча убили бы все @click.
// Теперь клик эмитится с реального контрола; disabled/loading его глушат (в т.ч. link-вариант).
function onClick(e: MouseEvent) {
  if (props.disabled || props.loading) { e.preventDefault(); return }
  emit('click', e)
}

// Высоты — спека §6.1/§6.2: CTA бренда 50px, паддинг 22–26px, min-width 184px.
// lg = дефолтный размер компонента и есть тот самый CTA. Базовый min-height 44px
// в .app-btn остаётся полом тач-цели (§28) для sm/md.
const sizeClass = computed(
  () =>
    ({
      sm: 'px-4 text-sm',
      md: 'px-5 text-sm',
      lg: 'min-h-[50px] px-6 text-base',
      xl: 'min-h-[50px] px-8 py-4 text-lg',
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
  if (!node) return

  const radius = 60
  const strength = 0.35

  function onMove(e: MouseEvent) {
    const rect = node!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    if (Math.hypot(dx, dy) < rect.width / 2 + radius) {
      node!.style.transition = 'transform 400ms cubic-bezier(.22,1,.36,1)'
      node!.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
    } else {
      reset()
    }
  }
  function reset() {
    node!.style.transition = 'transform 600ms cubic-bezier(.34,1.56,.64,1)'
    node!.style.transform = 'translate3d(0, 0, 0)'
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
    <NuxtLink
      v-if="to"
      :to="to"
      :class="btnClass"
      :aria-disabled="disabled || loading ? 'true' : undefined"
      :tabindex="disabled || loading ? -1 : undefined"
      @click="onClick"
    >
      <UIcon v-if="loading" name="i-lucide-loader-2" class="size-5 animate-spin" />
      <UIcon v-else-if="icon" :name="icon" class="size-5" />
      <span v-if="$slots.default"><slot /></span>
      <UIcon v-if="trailingIcon && !loading" :name="trailingIcon" class="size-5" />
    </NuxtLink>
    <button
      v-else
      :type="type"
      :disabled="disabled || loading"
      :class="btnClass"
      @click="onClick"
    >
      <UIcon v-if="loading" name="i-lucide-loader-2" class="size-5 animate-spin" />
      <UIcon v-else-if="icon" :name="icon" class="size-5" />
      <span v-if="$slots.default"><slot /></span>
      <UIcon v-if="trailingIcon && !loading" :name="trailingIcon" class="size-5" />
    </button>
  </span>
</template>
