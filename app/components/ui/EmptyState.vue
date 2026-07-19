<script setup lang="ts">
// Пустое состояние (§4.4): иконка + дружелюбный заголовок + подзаголовок + CTA (слот).
// Отсутствие проработанных пустых состояний = ощущение недоделанности (§4.4 ТЗ).
interface Props {
  icon?: string
  title: string
  text?: string
  compact?: boolean
  // алиас text — часть страниц (leads/shops) передаёт :description; раньше он молча терялся
  description?: string
}
const props = withDefaults(defineProps<Props>(), { icon: 'i-lucide-inbox' })
const subtitle = computed(() => props.text || props.description)
</script>

<template>
  <div :class="compact ? 'py-8' : 'py-16'" class="flex flex-col items-center text-center">
    <!-- фирменный медальон: бордо-градиент + grain + концентрические кольца -->
    <div class="relative">
      <div :class="compact ? 'size-14' : 'size-20'" class="ink-grain relative grid place-items-center rounded-full bg-linear-to-br from-ink-burgundy-light to-ink-burgundy-dark text-ink-cream shadow-burgundy">
        <UIcon :name="icon" :class="compact ? 'size-6' : 'size-9'" />
      </div>
      <span class="pointer-events-none absolute -inset-2.5 rounded-full border border-ink-burgundy/15" aria-hidden="true" />
      <span class="pointer-events-none absolute -inset-5 rounded-full border border-ink-burgundy/8" aria-hidden="true" />
    </div>
    <h3 :class="compact ? 'mt-5 text-xl' : 'mt-7 text-h3'" class="ink-display">{{ title }}</h3>
    <!-- Подпись наследует цвет контекста и гасится прозрачностью, а не берёт
         фиксированный Dark Soft: компонент живёт и в светлых кабинетах, и на
         Ink Black-каталоге — жёсткий тёмный текст там пропадал на тёмном. -->
    <p v-if="subtitle" class="text-current/70 mt-2 max-w-md">{{ subtitle }}</p>
    <div v-if="$slots.default" class="mt-6"><slot /></div>
  </div>
</template>
