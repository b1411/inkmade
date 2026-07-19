<script setup lang="ts">
export interface WorkspaceNavItem {
  label: string
  to: string
  icon: string
  exact?: boolean
}

// props в скрипте не читаем — все поля используются напрямую в шаблоне (авто-unwrap),
// поэтому defineProps без присваивания (иначе no-unused-vars ругается на `props`).
const props = withDefaults(defineProps<{
  title: string
  badge: string
  nav: WorkspaceNavItem[]
  homeTo?: string
  contentClass?: string
}>(), {
  homeTo: '/',
  contentClass: '',
})

const route = useRoute()
const workspaceVisual = computed(() => ({
  ACCOUNT: '/media/products/blank/classic-black-v01.webp',
  DESIGNER: '/media/prints/alatau-night-v01.webp',
  B2B: '/media/products/blank/tote-v01.webp',
  STUDIO: '/media/products/detail/cotton-collar-v01.webp',
  ADMIN: '/media/prints/nomad-grid-v01.webp',
}[props.badge] ?? '/media/hero/hero-home-desktop-v01.webp'))

function isActive(item: WorkspaceNavItem) {
  const exact = item.exact ?? item.to.split('/').filter(Boolean).length <= 1
  return exact ? route.path === item.to : route.path === item.to || route.path.startsWith(`${item.to}/`)
}
</script>

<template>
  <div class="min-h-screen bg-ink-bone text-ink-text-dark lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>

    <aside class="hidden min-h-screen overflow-hidden bg-ink-black text-ink-text lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div class="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <NuxtLink :to="homeTo" class="focus-ring rounded-sm" :aria-label="title">
          <UiAppLogo :subtitle="false" tone="light" />
        </NuxtLink>
        <span class="ink-label border border-white/15 px-2 py-1 text-[10px] text-ink-text-soft">{{ badge }}</span>
      </div>

      <div class="relative min-h-40 overflow-hidden border-b border-white/10">
        <NuxtImg :src="workspaceVisual" alt="" class="absolute inset-0 size-full object-cover object-center" sizes="264px" loading="eager" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-black via-ink-black/55 to-ink-black/10" />
        <div class="absolute inset-x-0 bottom-0 p-5">
          <p class="ink-label text-[10px] text-ink-text-muted">Workspace / {{ badge }}</p>
          <p class="mt-2 text-sm font-semibold text-ink-text">{{ title }}</p>
        </div>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4" :aria-label="title">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group mb-1 flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-burgundy"
          :class="isActive(item) ? 'border-ink-burgundy bg-white/8 font-semibold text-ink-text' : 'border-transparent text-ink-text-soft hover:border-white/20 hover:bg-white/5 hover:text-ink-text'"
        >
          <UIcon :name="item.icon" class="size-4 shrink-0" />
          <span class="min-w-0 truncate">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="border-t border-white/10 p-3">
        <slot name="rail-footer" />
      </div>
    </aside>

    <section class="min-w-0">
      <header class="sticky top-0 z-30 border-b border-ink-gray-200 bg-ink-paper/95 backdrop-blur-lg">
        <div class="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <NuxtLink :to="homeTo" class="focus-ring rounded-sm lg:hidden" :aria-label="title">
              <UiAppLogo :subtitle="false" />
            </NuxtLink>
            <span class="hidden h-6 w-px bg-ink-gray-200 sm:block lg:hidden" />
            <div class="min-w-0">
              <p class="ink-label hidden text-[10px] text-ink-burgundy sm:block lg:text-ink-gray-400">{{ badge }}</p>
              <p class="truncate text-sm font-semibold lg:text-base">{{ title }}</p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <slot name="header-actions" />
          </div>
        </div>

        <nav class="scrollbar-none flex gap-1 overflow-x-auto border-t border-ink-gray-200 px-4 py-2 lg:hidden" :aria-label="title">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="inline-flex min-h-10 shrink-0 items-center gap-2 border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-burgundy"
            :class="isActive(item) ? 'border-ink-burgundy bg-ink-burgundy text-ink-cream' : 'border-ink-gray-200 bg-ink-paper text-ink-gray-600 hover:border-ink-gray-400 hover:text-ink-black'"
          >
            <UIcon :name="item.icon" class="size-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>
      </header>

      <div class="relative h-28 overflow-hidden border-b border-ink-gray-200 lg:hidden">
        <NuxtImg :src="workspaceVisual" alt="" class="absolute inset-0 size-full object-cover object-center" sizes="100vw" loading="eager" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-black/90 via-ink-black/55 to-transparent" />
        <div class="absolute inset-0 flex flex-col justify-end p-4">
          <p class="ink-label text-[9px] text-white/55">Workspace / {{ badge }}</p>
          <p class="mt-1 max-w-[70%] truncate text-sm font-semibold text-white">{{ title }}</p>
        </div>
      </div>

      <main id="main-content" tabindex="-1" class="min-w-0 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8" :class="contentClass">
        <slot />
      </main>
    </section>
  </div>
</template>
