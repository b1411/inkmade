<script setup lang="ts">
// Шапка (§4.1): прозрачная поверх тёмного hero (только лендинг), при скролле —
// стекло + backdrop-blur, уменьшение высоты. Магнитная навигация (десктоп),
// бейдж корзины с «отскоком», полноэкранное мобильное меню со stagger.
import { useWindowScroll } from '@vueuse/core'
import { LEGAL } from '~~/shared/config/legal'

const route = useRoute()
const cart = useCart()
const cartCount = computed(() => cart.count.value)
const { homePath: cabinetTo } = useAuth()

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 40)
// Прозрачный режим — только над тёмным hero лендинга и пока не проскроллено.
const overHero = computed(() => route.path === '/' && !scrolled.value)

// Стекло включаем когда не overHero (проскроллено ИЛИ внутренняя страница).
const glass = computed(() => !overHero.value)

const navLinks = [
  { label: 'Каталог', to: '/catalog' },
  { label: 'Как это работает', to: '/#how' },
]

// ── Бейдж корзины: «отскок» при увеличении количества ──
const bouncing = ref(false)
watch(cartCount, (next, prev) => {
  if (next > (prev ?? 0)) {
    bouncing.value = false
    requestAnimationFrame(() => (bouncing.value = true))
    setTimeout(() => (bouncing.value = false), 600)
  }
})

// ── Мобильное меню ──
const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
// Блокировка скролла body при открытом меню
watch(menuOpen, (open) => {
  if (import.meta.client) {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})
// Закрытие по смене маршрута и Esc
watch(() => route.fullPath, closeMenu)
onMounted(() => {
  cart.load()
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
    :class="[
      glass
        ? 'bg-[var(--color-ink-glass)] backdrop-blur-md border-b border-black/5 shadow-sm text-ink-black'
        : 'bg-transparent text-ink-cream',
    ]"
  >
    <div
      class="mx-auto max-w-(--container-max) px-4 flex items-center justify-between transition-all duration-300"
      :class="scrolled ? 'h-14' : 'h-16'"
    >
      <NuxtLink to="/" class="ink-logo text-2xl tracking-wide" aria-label="INKMADE — на главную">
        INKMADE
      </NuxtLink>

      <!-- Десктоп-навигация -->
      <nav class="hidden md:flex items-center gap-7" aria-label="Основная навигация">
        <NuxtLink
          v-for="l in navLinks"
          :key="l.to"
          v-magnetic="0.3"
          :to="l.to"
          class="nav-link ink-label"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <!-- Иконки справа -->
      <div class="flex items-center gap-4">
        <NuxtLink to="/cart" class="relative inline-flex items-center" aria-label="Корзина">
          <UIcon name="i-lucide-shopping-cart" class="size-5" />
          <ClientOnly>
            <span
              v-if="cartCount"
              class="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-ink-burgundy text-ink-cream text-[10px] font-bold inline-flex items-center justify-center"
              :class="{ 'badge-pop': bouncing }"
            >
              {{ cartCount }}
            </span>
          </ClientOnly>
        </NuxtLink>
        <NuxtLink :to="cabinetTo" class="hidden md:inline-flex items-center" aria-label="Личный кабинет">
          <UIcon name="i-lucide-user" class="size-5" />
        </NuxtLink>
        <!-- Бургер (мобайл) -->
        <button
          class="md:hidden inline-flex items-center"
          :aria-expanded="menuOpen"
          aria-label="Меню"
          @click="menuOpen = !menuOpen"
        >
          <UIcon :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-6" />
        </button>
      </div>
    </div>

    <!-- Полноэкранное мобильное меню -->
    <Teleport to="body">
      <Transition name="menu">
        <div
          v-if="menuOpen"
          class="fixed inset-0 z-[60] bg-ink-burgundy text-ink-cream flex flex-col md:hidden"
        >
          <div class="flex items-center justify-between h-16 px-4">
            <span class="ink-logo text-2xl">INKMADE</span>
            <button aria-label="Закрыть меню" @click="closeMenu">
              <UIcon name="i-lucide-x" class="size-6" />
            </button>
          </div>
          <nav class="flex-1 flex flex-col justify-center gap-2 px-6" aria-label="Мобильная навигация">
            <NuxtLink
              v-for="(l, i) in navLinks"
              :key="l.to"
              v-motion
              :initial="{ opacity: 0, y: 24 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: 100 + i * 80 } }"
              :to="l.to"
              class="ink-display text-4xl py-2"
              @click="closeMenu"
            >
              {{ l.label }}
            </NuxtLink>
            <NuxtLink
              v-motion
              :initial="{ opacity: 0, y: 24 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: 100 + navLinks.length * 80 } }"
              :to="cabinetTo"
              class="ink-display text-4xl py-2"
              @click="closeMenu"
            >
              Кабинет
            </NuxtLink>
          </nav>
          <div class="px-6 py-8 ink-label text-ink-cream/60">
            {{ LEGAL.supportEmail }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}
</style>
