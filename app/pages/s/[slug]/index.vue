<script setup lang="ts">
// Публичная витрина B2B-магазина (Фаза B2). Путь /s/<slug> (субдомены — фаза B6).
// Свой брендовый хром (layout: false), тема из shop.theme через CSS-переменные.
// Данные — через RPC shop_storefront (аноним не видит access_code). Гейт роута — глобальный
// feature-flags middleware (404 при выключенном b2bStorefront).
import type { Json } from '~/types/database.types'
import type { StorefrontItem } from '~/composables/useShops'
import { safeCssUrl } from '~/utils/safeUrl'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { storefront, buyPayload } = useShops()
const cart = useCart()
const toast = useToast()
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

// ── выбор размера/цвета на карточке: itemId → выбранный variantId ──────────────
// Варианты = сиблинги того же продукта+материала (метод печати валиден). Сервер
// повторно валидирует выбор в buy_payload — UI-состояние не авторитетно.
const sel = reactive<Record<string, string>>({})
const variantsOf = (it: StorefrontItem) => it.variants ?? []
const selVariant = (it: StorefrontItem) => variantsOf(it).find(v => v.id === sel[it.id])
const hasSizes = (it: StorefrontItem) => variantsOf(it).length > 1
function colorsOf(it: StorefrontItem) {
  const m = new Map<string, { name: string; hex: string; inStock: boolean }>()
  for (const v of variantsOf(it)) {
    const e = m.get(v.color_hex)
    if (!e) m.set(v.color_hex, { name: v.color_name, hex: v.color_hex, inStock: v.in_stock })
    else if (v.in_stock) e.inStock = true
  }
  return [...m.values()]
}
const hasColors = (it: StorefrontItem) => colorsOf(it).length > 1
const sizesOf = (it: StorefrontItem) => variantsOf(it).filter(v => v.color_hex === selVariant(it)?.color_hex)
function pickColor(it: StorefrontItem, hex: string) {
  const cand = variantsOf(it).filter(v => v.color_hex === hex)
  const v = cand.find(x => x.in_stock) ?? cand[0]
  if (v) sel[it.id] = v.id
}
const pickSize = (it: StorefrontItem, variantId: string) => { sel[it.id] = variantId }
function canAdd(it: StorefrontItem) {
  const vs = variantsOf(it)
  return vs.length ? !!selVariant(it)?.in_stock : true
}
// дефолтный выбор при загрузке витрины (первый в наличии → дизайн-вариант → первый)
watch(items, (list) => {
  for (const it of list) {
    if (sel[it.id]) continue
    const vs = variantsOf(it)
    const def = vs.find(v => v.id === it.default_variant_id && v.in_stock)
      ?? vs.find(v => v.in_stock) ?? vs.find(v => v.id === it.default_variant_id) ?? vs[0]
    if (def) sel[it.id] = def.id
  }
}, { immediate: true })

// баннер hero — только безопасный http(s) URL владельца (анти CSS-инъекция, F6)
const bannerUrl = computed(() => safeCssUrl(shop.value?.hero?.banner_url))
const hasBanner = computed(() => !!bannerUrl.value)

const unlocking = ref(false)
async function unlock() {
  if (!code.value.trim()) return
  unlocking.value = true
  try {
    await refresh()
    // код не подошёл — магазин всё ещё закрыт: явный фидбэк (F12)
    if (data.value?.closed) toast.add({ title: t('shop.closed.wrongCode'), color: 'error' })
  } finally { unlocking.value = false }
}

// «в корзину»: тянем полную позицию через RPC (product/variant/spec владельца) и кладём
// в общую корзину с меткой магазина (shopItemId → атрибуция заказа на сервере).
const adding = ref<string | null>(null)
async function addToCart(it: StorefrontItem) {
  if (!canAdd(it)) return
  adding.value = it.id
  try {
    const p = await buyPayload(it.id, code.value || undefined, sel[it.id] || undefined)
    if (!p) { toast.add({ title: t('shop.buy.unavailable'), color: 'warning' }); return }
    cart.add({
      productId: p.productId, slug: p.slug, alias: p.alias, title: p.title,
      variantId: p.variantId, colorName: p.colorName, colorHex: p.colorHex, size: p.size,
      printMethod: p.printMethod, spec: p.spec as Json, unitPrice: p.unitPrice, quantity: 1,
      shopItemId: p.shopItemId,
      shopAccessCode: code.value || null,
    })
    toast.add({ title: t('shop.buy.added', { title: it.title }), color: 'success' })
  } catch (e) {
    toast.add({ title: t('shop.buy.error'), description: (e as Error).message, color: 'error' })
  } finally {
    adding.value = null
  }
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
      :style="hasBanner ? `background-image:url('${bannerUrl}');background-size:cover;background-position:center` : ''"
    >
      <div class="absolute inset-0" :style="hasBanner ? 'background:rgba(0,0,0,0.45)' : ''" />
      <div class="relative mx-auto max-w-(--container-max) px-6 py-16 sm:py-24">
        <h1
          class="text-4xl sm:text-5xl font-bold max-w-2xl"
          :class="hasBanner ? 'text-white' : ''"
          :style="hasBanner ? '' : 'color: var(--shop-primary)'"
        >
          {{ shop.hero?.title || shop.name }}
        </h1>
        <p
          v-if="shop.hero?.subtitle"
          class="text-lg mt-4 max-w-xl"
          :class="hasBanner ? 'text-white/85' : 'text-ink-gray-600'"
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

                <!-- выбор цвета/размера (сиблинги того же продукта+материала) -->
                <div v-if="hasSizes(it)" class="mt-3 space-y-2">
                  <div v-if="hasColors(it)" class="flex flex-wrap gap-1.5">
                    <button
                      v-for="c in colorsOf(it)"
                      :key="c.hex"
                      type="button"
                      :title="c.name"
                      class="size-6 rounded-full border-2 transition-transform hover:scale-110"
                      :style="{ backgroundColor: c.hex, borderColor: selVariant(it)?.color_hex === c.hex ? 'var(--shop-primary)' : 'rgba(0,0,0,0.12)' }"
                      @click="pickColor(it, c.hex)"
                    />
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-for="v in sizesOf(it)"
                      :key="v.id"
                      type="button"
                      :disabled="!v.in_stock"
                      class="min-w-8 px-2 py-1 rounded-md border text-xs font-medium transition-colors"
                      :class="!v.in_stock ? 'opacity-40 line-through cursor-not-allowed' : ''"
                      :style="{
                        borderColor: sel[it.id] === v.id ? 'var(--shop-primary)' : 'rgba(0,0,0,0.12)',
                        color: sel[it.id] === v.id ? 'var(--shop-primary)' : undefined,
                      }"
                      @click="pickSize(it, v.id)"
                    >{{ v.size }}</button>
                  </div>
                </div>

                <div class="mt-auto pt-3 flex items-center justify-between gap-2">
                  <span class="font-bold" style="color: var(--shop-primary)">{{ fmtPrice(it.price) }}</span>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    :style="{ background: 'var(--shop-primary)' }"
                    :disabled="adding === it.id || !canAdd(it)"
                    @click="addToCart(it)"
                  >
                    <UIcon :name="adding === it.id ? 'i-lucide-loader-2' : 'i-lucide-shopping-cart'" :class="['size-4', adding === it.id ? 'animate-spin' : '']" />
                    {{ canAdd(it) ? $t('shop.buy.add') : $t('shop.buy.soldOut') }}
                  </button>
                </div>
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
