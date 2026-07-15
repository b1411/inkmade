<script setup lang="ts">
// Шапка (§4.1): прозрачная поверх тёмного hero (только лендинг), при скролле —
// стекло + backdrop-blur, уменьшение высоты. Магнитная навигация (десктоп),
// бейдж корзины с «отскоком», полноэкранное мобильное меню со stagger.
import { useWindowScroll } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import { LEGAL } from '~~/shared/config/legal'

const route = useRoute()
const { t } = useI18n()
const cart = useCart()
const cartCount = computed(() => cart.count.value)
const { homePath: cabinetTo, isAuthenticated, signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
const userMenu = computed<DropdownMenuItem[][]>(() => [
  [{ label: t('header.myCabinet'), icon: 'i-lucide-layout-dashboard', to: cabinetTo.value }],
  [{ label: t('header.signOut'), icon: 'i-lucide-log-out', onSelect: onSignOut }],
])

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 40)
// Прозрачный режим — только над тёмным hero лендинга и пока не проскроллено.
const overHero = computed(() => route.path === '/' && !scrolled.value)

// Стекло включаем когда не overHero (проскроллено ИЛИ внутренняя страница).
const glass = computed(() => !overHero.value)

const navLinks = computed(() => [
  { label: t('nav.catalog'), to: '/catalog' },
  { label: t('nav.howItWorks'), to: '/#how' },
])

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
const menuEl = ref<HTMLElement | null>(null)
let menuTrigger: HTMLElement | null = null
function closeMenu() {
  menuOpen.value = false
}
// Блокировка скролла body + управление фокусом (a11y): при открытии переносим фокус
// в меню, при закрытии возвращаем на кнопку-триггер (иначе фокус «терялся» за оверлеем).
watch(menuOpen, async (open) => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (open) {
    menuTrigger = document.activeElement as HTMLElement | null
    await nextTick()
    menuFocusables()[0]?.focus()
  } else if (menuTrigger) {
    menuTrigger.focus()
    menuTrigger = null
  }
})
function menuFocusables(): HTMLElement[] {
  const el = menuEl.value
  if (!el) return []
  return Array.from(
    el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ).filter(n => n.offsetParent !== null)
}
// Фокус-трап: Tab/Shift+Tab циклит внутри открытого меню, не выпуская за оверлей.
function onMenuKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const items = menuFocusables()
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement as HTMLElement | null
  const inside = !!menuEl.value?.contains(active)
  if (e.shiftKey && (active === first || !inside)) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus() }
}
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
      <!-- Лого. Оба варианта держим в DOM и кросс-фейдим: подложка шапки едет с тёмного
           hero на светлое стекло, надпись обязана перекраситься вместе с ней и в тот же
           такт (--dur 300ms). Подмена src моргнула бы белым на первом скролле. Кадры у
           вариантов идентичные (см. scripts/gen-logo.mjs), поэтому буквы не «прыгают». -->
      <NuxtLink
        to="/"
        class="relative block shrink-0 transition-all duration-300"
        :class="scrolled ? 'h-7' : 'h-8'"
        :aria-label="$t('header.toHome')"
      >
        <img
          src="/logo-light.svg"
          alt=""
          width="1328"
          height="305"
          class="h-full w-auto transition-opacity duration-300"
          :class="glass ? 'opacity-0' : 'opacity-100'"
        >
        <img
          src="/logo-dark.svg"
          alt=""
          width="1328"
          height="305"
          class="absolute left-0 top-0 h-full w-auto transition-opacity duration-300"
          :class="glass ? 'opacity-100' : 'opacity-0'"
        >
      </NuxtLink>

      <!-- Десктоп-навигация -->
      <nav class="hidden md:flex items-center gap-7" :aria-label="$t('header.mainNav')">
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
        <UiLangSwitcher class="hidden sm:inline-flex" />
        <NuxtLink to="/cart" data-cart-icon class="relative inline-flex items-center" :aria-label="$t('header.cart')">
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
        <ClientOnly>
          <UDropdownMenu v-if="isAuthenticated" :items="userMenu" :content="{ align: 'end' }">
            <button class="hidden md:inline-flex items-center" :aria-label="$t('header.account')">
              <UIcon name="i-lucide-user" class="size-5" />
            </button>
          </UDropdownMenu>
          <NuxtLink v-else to="/login" class="hidden md:inline-flex items-center" :aria-label="$t('header.login')">
            <UIcon name="i-lucide-user" class="size-5" />
          </NuxtLink>
          <template #fallback>
            <NuxtLink to="/login" class="hidden md:inline-flex items-center" :aria-label="$t('header.login')">
              <UIcon name="i-lucide-user" class="size-5" />
            </NuxtLink>
          </template>
        </ClientOnly>
        <!-- Бургер (мобайл) -->
        <button
          class="md:hidden inline-flex items-center"
          :aria-expanded="menuOpen"
          :aria-label="$t('header.menu')"
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
          ref="menuEl"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('header.menu')"
          class="fixed inset-0 z-[60] bg-ink-burgundy text-ink-cream flex flex-col md:hidden"
          @keydown="onMenuKeydown"
        >
          <div class="flex items-center justify-between h-16 px-4">
            <img src="/logo-light.svg" alt="INKMADE" width="1328" height="305" class="h-8 w-auto">
            <button :aria-label="$t('header.closeMenu')" @click="closeMenu">
              <UIcon name="i-lucide-x" class="size-6" />
            </button>
          </div>
          <nav class="flex-1 flex flex-col justify-center gap-2 px-6" :aria-label="$t('header.mobileNav')">
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
              {{ $t('nav.cabinet') }}
            </NuxtLink>
            <ClientOnly>
              <button
                v-if="isAuthenticated"
                class="ink-display text-4xl py-2 text-left text-ink-cream/80"
                @click="closeMenu(); onSignOut()"
              >
                {{ $t('header.signOut') }}
              </button>
            </ClientOnly>
          </nav>
          <div class="px-6 py-8 flex items-center justify-between gap-4">
            <span class="ink-label text-ink-cream/60">{{ LEGAL.supportEmail }}</span>
            <UiLangSwitcher />
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
