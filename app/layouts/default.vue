<script setup lang="ts">
// Публичный layout (лендинг/каталог), §4. Тёмный header в фирменном бордо.
import { LEGAL } from '~~/shared/config/legal'
const cart = useCart()
const cartCount = computed(() => cart.count.value)
// «Кабинет» ведёт в кабинет по роли (CRM §2) — единый источник в useAuth
const { homePath: cabinetTo } = useAuth()
onMounted(() => cart.load())
</script>

<template>
  <div class="min-h-screen flex flex-col bg-ink-white text-ink-black">
    <header class="bg-ink-burgundy text-ink-cream">
      <div class="mx-auto max-w-(--container-max) px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="ink-logo text-2xl tracking-wide">INKMADE</NuxtLink>
        <nav class="flex items-center gap-4" aria-label="Основная навигация">
          <NuxtLink to="/catalog" class="ink-label hover:opacity-80">Каталог</NuxtLink>
          <NuxtLink to="/cart" class="inline-flex items-center gap-1 ink-label hover:opacity-80">
            <UIcon name="i-lucide-shopping-cart" class="size-4" />
            <ClientOnly><span v-if="cartCount">{{ cartCount }}</span></ClientOnly>
          </NuxtLink>
          <NuxtLink :to="cabinetTo" class="inline-flex items-center gap-1 ink-label hover:opacity-80">
            <UIcon name="i-lucide-user" class="size-4" />
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-(--container-max) px-4 py-8">
      <slot />
    </main>

    <footer class="bg-ink-black text-ink-cream/70 mt-12">
      <div class="mx-auto max-w-(--container-max) px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <p class="ink-logo text-xl text-ink-cream">INKMADE</p>
          <p class="ink-label mt-2 text-ink-cream/50">Merch Studio · EST. 2025</p>
          <p class="text-caption mt-3">Печать своего принта на одежде. Тираж от одной штуки. Казахстан.</p>
        </div>
        <div class="space-y-2">
          <p class="ink-label text-ink-cream/50">Каталог</p>
          <NuxtLink to="/catalog" class="block text-caption hover:text-ink-cream">Все категории</NuxtLink>
          <NuxtLink to="/cart" class="block text-caption hover:text-ink-cream">Корзина</NuxtLink>
          <NuxtLink to="/account" class="block text-caption hover:text-ink-cream">Личный кабинет</NuxtLink>
        </div>
        <div class="space-y-2">
          <p class="ink-label text-ink-cream/50">Информация</p>
          <NuxtLink to="/legal/terms" class="block text-caption hover:text-ink-cream">Условия использования</NuxtLink>
          <NuxtLink to="/legal/privacy" class="block text-caption hover:text-ink-cream">Конфиденциальность</NuxtLink>
        </div>
        <div class="space-y-2">
          <p class="ink-label text-ink-cream/50">Контакты</p>
          <a :href="`mailto:${LEGAL.supportEmail}`" class="block text-caption hover:text-ink-cream">{{ LEGAL.supportEmail }}</a>
          <div class="flex items-center gap-3 pt-1">
            <a href="https://instagram.com/inkmade" target="_blank" rel="noopener" aria-label="Instagram" class="hover:text-ink-cream">
              <UIcon name="i-lucide-instagram" class="size-5" />
            </a>
            <a href="https://tiktok.com/@inkmade" target="_blank" rel="noopener" aria-label="TikTok" class="hover:text-ink-cream">
              <UIcon name="i-lucide-music-2" class="size-5" />
            </a>
          </div>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="mx-auto max-w-(--container-max) px-4 py-4 ink-label text-ink-cream/40">
          © 2025 INKMADE · Цвет на экране может отличаться от печати
        </div>
      </div>
    </footer>
  </div>
</template>
