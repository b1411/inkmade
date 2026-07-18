<script setup lang="ts">
// Шапка — спека §9. Высота 64px (постоянная: прежнее сжатие до 56px при скролле
// дёргало layout и в спеке его нет), подложка Ink Black 96% + blur 12px, снизу
// Light Line. Прозрачна только поверх hero лендинга. Магнитная навигация (десктоп),
// бейдж корзины с «отскоком», полноэкранное мобильное меню со stagger (§9, Ink Black).
import { useWindowScroll } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import { LEGAL } from '~~/shared/config/legal'
import { FEATURES } from '~~/shared/config/features'

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

// Высота верхней инфо-полосы (§8). Должна совпадать с .top-bar-text в
// layout/TopInfoBar.vue — рассинхрон даст щель или перекрытие.
const TOP_BAR_H = 30

// §8: полоса не sticky и уходит вверх при скролле, шапка «садится» на top: 0
// только после неё. Шапка у нас fixed, поэтому считаем смещение сами. Ступенька
// по флагу `scrolled` тут не годится: между 0 и 40px полоса уже уползала, а шапка
// ещё стояла на 30px — в щели просвечивал hero. max(0, H - y) отслеживает полосу
// пиксель в пиксель и упирается в 0.
const headerTop = computed(() => `${Math.max(0, TOP_BAR_H - y.value)}px`)

// Стекло включаем когда не overHero (проскроллено ИЛИ внутренняя страница).
const glass = computed(() => !overHero.value)

const navLinks = computed(() => [
  { label: t('nav.catalog'), to: '/catalog' },
  { label: t('nav.howItWorks'), to: '/#how' },
])

// Мобильное меню = список крупных ссылок, кнопке там негде выделиться, поэтому
// «Для компаний» идёт обычным пунктом; на десктопе тот же вход — кнопка справа.
// Отдельный массив (а не navLinks), чтобы в десктоп-nav ссылка не задвоилась.
const menuLinks = computed(() => [
  ...navLinks.value,
  ...(FEATURES.b2bShops ? [{ label: t('nav.business'), to: '/business' }] : []),
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
    class="fixed inset-x-0 z-50 transition-colors duration-300 text-ink-text"
    :style="{ top: headerTop }"
    :class="[
      glass
        ? 'bg-[var(--color-ink-glass)] backdrop-blur-[12px] border-b border-[var(--ink-line)]'
        : 'bg-transparent',
    ]"
  >
    <div
      class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between"
    >
      <!-- Лого — всегда светлый вариант: подложка шапки теперь Ink Black в обоих
           состояниях (прозрачно над тёмным hero → Ink Black 96% при скролле), тёмная
           надпись на ней нечитаема. Прежний кросс-фейд logo-light/logo-dark обслуживал
           переход на СВЕТЛОЕ стекло, которого больше нет — второй кадр снят. -->
      <!-- h-4, а не h-8: надпись сменилась на вдвое более широкую относительно высоты
           (8.7:1 против 4.4:1), и h-8 дала бы 279px вместо 140px. На md шапка с такой
           надписью не сходится — nav и кнопки уезжают за край. h-4 держит прежние 140px. -->
      <NuxtLink
        to="/"
        class="block shrink-0 h-4"
        :aria-label="$t('header.toHome')"
      >
        <img
          src="/logo-light.svg"
          alt=""
          width="1275"
          height="146"
          class="h-full w-auto"
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
        <!-- Вход в B2B-воронку (§B1). Кнопкой, а не пунктом nav: секция «для команд»
             снята с лендинга, и это единственная точка входа — текстовой ссылкой она
             бы потерялась. on-dark теперь постоянный, а не завязан на overHero:
             подложка шапки тёмная в ОБОИХ состояниях, и светлый вариант secondary
             рисовал бы тёмную обводку по тёмному фону. -->
        <div v-if="FEATURES.b2bShops" class="hidden md:block">
          <UiAppButton to="/business" variant="secondary" size="sm" on-dark>
            {{ $t('nav.business') }}
          </UiAppButton>
        </div>
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
          class="fixed inset-0 z-[60] bg-ink-black text-ink-text flex flex-col md:hidden"
          @keydown="onMenuKeydown"
        >
          <div class="flex items-center justify-between h-16 px-4">
            <img src="/logo-light.svg" alt="INKMADE" width="1275" height="146" class="h-4 w-auto">
            <button :aria-label="$t('header.closeMenu')" @click="closeMenu">
              <UIcon name="i-lucide-x" class="size-6" />
            </button>
          </div>
          <nav class="flex-1 flex flex-col justify-center gap-2 px-6" :aria-label="$t('header.mobileNav')">
            <NuxtLink
              v-for="(l, i) in menuLinks"
              :key="l.to"
              :to="l.to"
              class="menu-link-enter ink-display text-4xl py-2"
              :style="{ animationDelay: `${100 + i * 80}ms` }"
              @click="closeMenu"
            >
              {{ l.label }}
            </NuxtLink>
            <NuxtLink
              v-if="isAuthenticated"
              :to="cabinetTo"
              class="menu-link-enter ink-display text-4xl py-2"
              :style="{ animationDelay: `${100 + menuLinks.length * 80}ms` }"
              @click="closeMenu"
            >
              {{ $t('nav.cabinet') }}
            </NuxtLink>
            <NuxtLink
              v-else
              to="/login"
              class="menu-link-enter ink-display text-4xl py-2"
              :style="{ animationDelay: `${100 + menuLinks.length * 80}ms` }"
              @click="closeMenu"
            >
              {{ $t('header.login') }}
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
.menu-link-enter {
  opacity: 0;
  animation: menu-link-in 500ms var(--ease-out) forwards;
}
@keyframes menu-link-in {
  from { opacity: 0; transform: translate3d(0, 24px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .menu-link-enter { opacity: 1; animation: none; }
}
</style>
