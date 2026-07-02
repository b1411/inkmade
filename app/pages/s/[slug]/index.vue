<script setup lang="ts">
// Публичная витрина B2B-магазина (Фаза B2). Путь /s/<slug> (субдомены — фаза B6).
// Свой брендовый хром (layout: false), тема из shop.theme через CSS-переменные.
// Данные — через RPC shop_storefront (аноним не видит access_code). Гейт роута — глобальный
// feature-flags middleware (404 при выключенном b2bStorefront).
definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { storefront } = useShops()
const { t } = useI18n()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade-pi.vercel.app'

const code = ref('')
const { data, pending, refresh } = await useAsyncData(
  () => `shop-${slug.value}`,
  () => storefront(slug.value, code.value || undefined),
)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: t('shop.notFound') })
}

const shop = computed(() => data.value?.shop)
const items = computed(() => data.value?.items ?? [])
const isClosed = computed(() => !!data.value?.closed)

useSeoMeta({
  title: () => (shop.value ? `${shop.value.name} — INKMADE` : 'INKMADE'),
  description: () => shop.value?.hero?.subtitle || t('shop.metaDescription', { name: shop.value?.name ?? '' }),
  ogTitle: () => shop.value?.name ?? 'INKMADE',
  ogImage: () => shop.value?.hero?.banner_url || undefined,
})

// тема магазина → CSS-переменные (с фолбэком на бренд INKMADE)
const styleVars = computed(() => ({
  '--shop-primary': shop.value?.theme?.primary || '#6b1e2e',
  '--shop-accent': shop.value?.theme?.accent || shop.value?.theme?.primary || '#6b1e2e',
  '--shop-bg': shop.value?.theme?.bg || '#faf7f2',
}))

const fmtPrice = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} ₸`

const unlocking = ref(false)
async function unlock() {
  if (!code.value.trim()) return
  unlocking.value = true
  try { await refresh() } finally { unlocking.value = false }
}

const contacts = computed(() => shop.value?.contacts ?? {})
</script>

<template>
  <div v-if="shop" :style="styleVars" class="min-h-screen flex flex-col" style="background: var(--shop-bg)">
    <!-- шапка магазина -->
    <header class="border-b border-black/5">
      <div class="mx-auto max-w-(--container-max) px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img v-if="shop.logo_url" :src="shop.logo_url" :alt="shop.name" class="h-9 w-auto object-contain">
          <span class="text-xl font-bold" style="color: var(--shop-primary)">{{ shop.name }}</span>
        </div>
        <NuxtLink to="/" class="text-caption text-ink-gray-500 hover:text-ink-gray-700">{{ $t('shop.poweredBy') }}</NuxtLink>
      </div>
    </header>

    <!-- hero -->
    <section
      class="relative overflow-hidden"
      :style="shop.hero?.banner_url ? `background-image:url('${shop.hero.banner_url}');background-size:cover;background-position:center` : ''"
    >
      <div class="absolute inset-0" :style="shop.hero?.banner_url ? 'background:rgba(0,0,0,0.45)' : ''" />
      <div class="relative mx-auto max-w-(--container-max) px-6 py-16 sm:py-24">
        <h1
          class="text-4xl sm:text-5xl font-bold max-w-2xl"
          :class="shop.hero?.banner_url ? 'text-white' : ''"
          :style="shop.hero?.banner_url ? '' : 'color: var(--shop-primary)'"
        >
          {{ shop.hero?.title || shop.name }}
        </h1>
        <p
          v-if="shop.hero?.subtitle"
          class="text-lg mt-4 max-w-xl"
          :class="shop.hero?.banner_url ? 'text-white/85' : 'text-ink-gray-600'"
        >
          {{ shop.hero.subtitle }}
        </p>
      </div>
    </section>

    <!-- контент -->
    <main class="flex-1">
      <div class="mx-auto max-w-(--container-max) px-6 py-12">
        <!-- закрытый магазин: запрос кода -->
        <div v-if="isClosed" class="max-w-sm mx-auto text-center py-16">
          <UIcon name="i-lucide-lock" class="size-10 mx-auto text-ink-gray-400" />
          <h2 class="text-xl font-bold mt-4">{{ $t('shop.closed.title') }}</h2>
          <p class="text-ink-gray-600 mt-2">{{ $t('shop.closed.text') }}</p>
          <div class="mt-6 flex gap-2">
            <UInput v-model="code" :placeholder="$t('shop.closed.codePlaceholder')" class="flex-1" @keyup.enter="unlock" />
            <UButton :loading="unlocking" @click="unlock">{{ $t('shop.closed.unlock') }}</UButton>
          </div>
        </div>

        <!-- витрина -->
        <template v-else>
          <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <UiSkeleton v-for="n in 8" :key="n" rounded="rounded-xl" class="aspect-[3/4]" />
          </div>

          <div v-else-if="!items.length" class="text-center py-20">
            <UIcon name="i-lucide-package-open" class="size-12 mx-auto text-ink-gray-300" />
            <h2 class="text-xl font-bold mt-4">{{ $t('shop.empty.title') }}</h2>
            <p class="text-ink-gray-600 mt-2">{{ $t('shop.empty.text') }}</p>
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <article
              v-for="it in items"
              :key="it.id"
              class="group rounded-xl overflow-hidden bg-white border border-black/5 flex flex-col"
            >
              <div class="aspect-[3/4] bg-ink-cream/40 overflow-hidden">
                <img
                  v-if="it.preview_url"
                  :src="it.preview_url"
                  :alt="it.title"
                  class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                >
                <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-300">
                  <UIcon name="i-lucide-shirt" class="size-10" />
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-semibold">{{ it.title }}</h3>
                <p v-if="it.description" class="text-caption text-ink-gray-500 mt-1 line-clamp-2">{{ it.description }}</p>
                <div class="mt-auto pt-3 font-bold" style="color: var(--shop-primary)">{{ fmtPrice(it.price) }}</div>
              </div>
            </article>
          </div>
        </template>
      </div>
    </main>

    <!-- футер -->
    <footer class="border-t border-black/5 mt-8">
      <div class="mx-auto max-w-(--container-max) px-6 py-8 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4 text-caption text-ink-gray-500">
          <a v-if="contacts.instagram" :href="`https://instagram.com/${contacts.instagram.replace(/^@/, '')}`" target="_blank" class="inline-flex items-center gap-1 hover:text-ink-gray-700">
            <UIcon name="i-lucide-instagram" class="size-4" /> {{ contacts.instagram }}
          </a>
          <a v-if="contacts.phone" :href="`tel:${contacts.phone}`" class="inline-flex items-center gap-1 hover:text-ink-gray-700">
            <UIcon name="i-lucide-phone" class="size-4" /> {{ contacts.phone }}
          </a>
        </div>
        <NuxtLink :to="site" class="text-caption text-ink-gray-400 hover:text-ink-gray-600">{{ $t('shop.poweredByFull') }}</NuxtLink>
      </div>
    </footer>
  </div>
</template>
