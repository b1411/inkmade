<script setup lang="ts">
// Публичная витрина B2B-магазина (Фаза B2). Путь /s/<slug> (субдомены — фаза B6).
// Свой брендовый хром (layout: false), тема из shop.theme через CSS-переменные.
// Данные — через RPC shop_storefront (аноним не видит access_code). Гейт роута — глобальный
// feature-flags middleware (404 при выключенном b2bStorefront).
import type { Json } from '~/types/database.types'
import type { StorefrontItem } from '~/composables/useShops'
import { safeCssUrl } from '~/utils/safeUrl'
import { resolveTheme, heroLayout, cardRatio, heroOverlay } from '~~/shared/config/shop-theme'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { storefront, buyPayload, track } = useShops()
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

// тема магазина → CSS-переменные (резолв свет/тьма в shared/config/shop-theme). Токены
// text/muted/surface/border/on-primary делают витрину корректной и в тёмной теме.
const rt = computed(() => resolveTheme(shop.value?.theme))
const styleVars = computed(() => ({
  '--shop-primary': rt.value.primary,
  '--shop-accent': rt.value.accent,
  '--shop-bg': rt.value.bg,
  '--shop-on-primary': rt.value.onPrimary,
  '--shop-text': rt.value.text,
  '--shop-muted': rt.value.muted,
  '--shop-surface': rt.value.surface,
  '--shop-border': rt.value.border,
  '--shop-font': rt.value.font,
  '--shop-radius': rt.value.radius,
  'fontFamily': 'var(--shop-font)',
  'color': 'var(--shop-text)',
  'background': 'var(--shop-bg)',
}))

// ── конфиг раскладки/секций/карточек (модули B/C/D) ──────────────────────────
const layoutCfg = computed(() => shop.value?.layout ?? {})
const showHero = computed(() => layoutCfg.value.showHero !== false)
const heroLay = computed(() => heroLayout(shop.value?.hero?.layout))
const heroOverlayPct = computed(() => heroOverlay(shop.value?.hero?.overlay))
const heroCta = computed(() => (shop.value?.hero?.cta_text ?? '').trim())
const announce = computed(() => {
  const a = layoutCfg.value.announcement
  return a?.on && a.text?.trim() ? a.text.trim() : ''
})
const about = computed(() => {
  const a = layoutCfg.value.about
  return a?.on && (a.title?.trim() || a.text?.trim()) ? a : null
})
const cardsCfg = computed(() => layoutCfg.value.cards ?? {})
const cardRatioVal = computed(() => cardRatio(cardsCfg.value.ratio))
const showPrice = computed(() => cardsCfg.value.showPrice !== false)
const showDesc = computed(() => cardsCfg.value.showDesc !== false)

function scrollToItems() {
  if (import.meta.client) document.getElementById('shop-items')?.scrollIntoView({ behavior: 'smooth' })
}

// порядок секций (модуль C): владелец задаёт последовательность hero/товары/«О магазине».
// Реализуем через CSS order во flex-колонке — без реструктуризации DOM.
const SECTION_KEYS = ['hero', 'items', 'about'] as const
const orderedSections = computed(() => {
  const raw = Array.isArray(layoutCfg.value.order)
    ? (layoutCfg.value.order as string[]).filter(k => (SECTION_KEYS as readonly string[]).includes(k))
    : []
  for (const k of SECTION_KEYS) if (!raw.includes(k)) raw.push(k)
  return raw
})
const pos = (k: string) => orderedSections.value.indexOf(k)
const heroStyle = computed(() => {
  const s: Record<string, string | number> = { order: pos('hero') }
  if (hasBanner.value) {
    s.backgroundImage = `url('${bannerUrl.value}')`
    s.backgroundSize = 'cover'
    s.backgroundPosition = 'center'
  }
  return s
})

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
// быстрый просмотр товара (Tier2 D): модалка с большим фото/описанием/выбором/шарингом
const quick = ref<StorefrontItem | null>(null)
const quickOpen = computed({ get: () => !!quick.value, set: (v: boolean) => { if (!v) quick.value = null } })
const openQuick = (it: StorefrontItem) => {
  quick.value = it
  if (shop.value) track(shop.value.id, 'item_view', it.id)
}
async function addFromQuick() {
  if (!quick.value) return
  if (await addToCart(quick.value)) quick.value = null
}

async function shareItem(it: StorefrontItem) {
  const url = `${site}/s/${slug.value}?item=${it.id}`
  try {
    if (import.meta.client && navigator.share) await navigator.share({ title: it.title, url })
    else { await navigator.clipboard.writeText(url); toast.add({ title: t('shop.buy.linkCopied'), color: 'success' }) }
  } catch { /* пользователь отменил шаринг */ }
}

// трекинг просмотра витрины + deep-link (/s/<slug>?item=<id> открывает товар)
onMounted(() => {
  if (shop.value) track(shop.value.id, 'view')
  const id = route.query.item
  if (typeof id === 'string') { const it = items.value.find(x => x.id === id); if (it) openQuick(it) }
})

const adding = ref<string | null>(null)
async function addToCart(it: StorefrontItem): Promise<boolean> {
  if (!canAdd(it)) return false
  adding.value = it.id
  try {
    const p = await buyPayload(it.id, code.value || undefined, sel[it.id] || undefined)
    if (!p) { toast.add({ title: t('shop.buy.unavailable'), color: 'warning' }); return false }
    cart.add({
      productId: p.productId, slug: p.slug, alias: p.alias, title: p.title,
      variantId: p.variantId, colorName: p.colorName, colorHex: p.colorHex, size: p.size,
      printMethod: p.printMethod, spec: p.spec as Json, unitPrice: p.unitPrice, quantity: 1,
      shopItemId: p.shopItemId,
      shopAccessCode: code.value || null,
    })
    toast.add({ title: t('shop.buy.added', { title: it.title }), color: 'success' })
    if (shop.value) track(shop.value.id, 'add_to_cart', it.id)
    return true
  } catch (e) {
    toast.add({ title: t('shop.buy.error'), description: (e as Error).message, color: 'error' })
    return false
  } finally {
    adding.value = null
  }
}

const contacts = computed(() => shop.value?.contacts ?? {})
</script>

<template>
  <div v-if="shop" :style="styleVars" class="min-h-screen flex flex-col" style="background: var(--shop-bg)">
    <!-- строка-объявление (модуль C) -->
    <div v-if="announce" class="text-center text-sm font-medium px-4 py-2" style="background: var(--shop-primary); color: var(--shop-on-primary)">
      {{ announce }}
    </div>

    <!-- шапка магазина -->
    <header class="border-b sf-bord">
      <div class="mx-auto max-w-(--container-max) px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img v-if="shop.logo_url" :src="shop.logo_url" :alt="shop.name" class="h-9 w-auto object-contain">
          <span class="text-xl font-bold" style="color: var(--shop-primary)">{{ shop.name }}</span>
        </div>
        <NuxtLink to="/" class="text-caption sf-muted hover:opacity-70">{{ $t('shop.poweredBy') }}</NuxtLink>
      </div>
    </header>

    <!-- контент: порядок секций задаёт владелец (модуль C) через CSS order -->
    <main class="flex-1 flex flex-col">
      <!-- hero (модуль B: раскладка/затемнение/CTA; тумблер показа) -->
      <section
        v-if="showHero"
        class="relative overflow-hidden"
        :style="heroStyle"
      >
      <div v-if="hasBanner" class="absolute inset-0" :style="{ background: `rgba(0,0,0,${heroOverlayPct / 100})` }" />
      <div
        class="relative mx-auto max-w-(--container-max) px-6"
        :class="[
          heroLay === 'compact' ? 'py-10 sm:py-12' : 'py-16 sm:py-24',
          heroLay === 'center' ? 'text-center flex flex-col items-center' : '',
        ]"
      >
        <h1
          class="font-bold"
          :class="[
            heroLay === 'compact' ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl',
            heroLay === 'center' ? 'max-w-3xl' : 'max-w-2xl',
            hasBanner ? 'text-white' : '',
          ]"
          :style="hasBanner ? '' : 'color: var(--shop-primary)'"
        >
          {{ shop.hero?.title || shop.name }}
        </h1>
        <p
          v-if="shop.hero?.subtitle"
          class="text-lg mt-4"
          :class="[heroLay === 'center' ? 'max-w-2xl' : 'max-w-xl', hasBanner ? 'text-white/85' : 'sf-muted']"
        >
          {{ shop.hero.subtitle }}
        </p>
        <button
          v-if="heroCta"
          class="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          :style="{ background: 'var(--shop-primary)', color: 'var(--shop-on-primary)', borderRadius: 'var(--shop-radius)' }"
          @click="scrollToItems"
        >
          {{ heroCta }}
          <UIcon name="i-lucide-arrow-down" class="size-4" />
        </button>
      </div>
    </section>

      <!-- товары -->
      <section :style="{ order: pos('items') }">
        <div id="shop-items" class="mx-auto max-w-(--container-max) px-6 py-12">
        <!-- закрытый магазин: запрос кода -->
        <div v-if="isClosed" class="max-w-sm mx-auto text-center py-16">
          <UIcon name="i-lucide-lock" class="size-10 mx-auto sf-muted" />
          <h2 class="text-xl font-bold mt-4">{{ $t('shop.closed.title') }}</h2>
          <p class="sf-muted mt-2">{{ $t('shop.closed.text') }}</p>
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
            <UIcon name="i-lucide-package-open" class="size-12 mx-auto sf-muted" />
            <h2 class="text-xl font-bold mt-4">{{ $t('shop.empty.title') }}</h2>
            <p class="sf-muted mt-2">{{ $t('shop.empty.text') }}</p>
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <article
              v-for="it in items"
              :key="it.id"
              class="group overflow-hidden sf-surface border sf-bord flex flex-col"
              :style="{ borderRadius: 'var(--shop-radius)' }"
            >
              <button
                type="button"
                class="sf-surface overflow-hidden block w-full cursor-pointer"
                :style="{ aspectRatio: cardRatioVal }"
                :aria-label="it.title"
                @click="openQuick(it)"
              >
                <img
                  v-if="it.preview_url"
                  :src="it.preview_url"
                  :alt="it.title"
                  class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                >
                <div v-else class="w-full h-full flex items-center justify-center sf-muted">
                  <UIcon name="i-lucide-shirt" class="size-10" />
                </div>
              </button>
              <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-semibold">{{ it.title }}</h3>
                <p v-if="it.description && showDesc" class="text-caption sf-muted mt-1 line-clamp-2">{{ it.description }}</p>

                <!-- выбор цвета/размера (сиблинги того же продукта+материала) -->
                <div v-if="hasSizes(it)" class="mt-3 space-y-2">
                  <div v-if="hasColors(it)" class="flex flex-wrap gap-1.5">
                    <button
                      v-for="c in colorsOf(it)"
                      :key="c.hex"
                      type="button"
                      :title="c.name"
                      class="size-6 rounded-full border-2 transition-transform hover:scale-110"
                      :style="{ backgroundColor: c.hex, borderColor: selVariant(it)?.color_hex === c.hex ? 'var(--shop-primary)' : 'var(--shop-border)' }"
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
                        borderColor: sel[it.id] === v.id ? 'var(--shop-primary)' : 'var(--shop-border)',
                        color: sel[it.id] === v.id ? 'var(--shop-primary)' : undefined,
                      }"
                      @click="pickSize(it, v.id)"
                    >{{ v.size }}</button>
                  </div>
                </div>

                <div class="mt-auto pt-3 flex items-center justify-between gap-2">
                  <span v-if="showPrice" class="font-bold" style="color: var(--shop-primary)">{{ fmtPrice(it.price) }}</span>
                  <span v-else />
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    :style="{ background: 'var(--shop-primary)', color: 'var(--shop-on-primary)', borderRadius: 'var(--shop-radius)' }"
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
      </section>

      <!-- блок «О магазине» (модуль C) -->
      <section v-if="about" class="border-t sf-bord" :style="{ background: 'color-mix(in srgb, var(--shop-primary) 4%, transparent)', order: pos('about') }">
        <div class="mx-auto max-w-3xl px-6 py-12 text-center">
          <h2 v-if="about.title" class="text-2xl font-bold" style="color: var(--shop-primary)">{{ about.title }}</h2>
          <p v-if="about.text" class="mt-3 sf-muted whitespace-pre-line leading-relaxed">{{ about.text }}</p>
        </div>
      </section>
    </main>

    <!-- футер -->
    <footer class="border-t sf-bord mt-8">
      <div class="mx-auto max-w-(--container-max) px-6 py-8 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4 text-caption sf-muted">
          <a v-if="contacts.instagram" :href="`https://instagram.com/${contacts.instagram.replace(/^@/, '')}`" target="_blank" class="inline-flex items-center gap-1 hover:opacity-70">
            <UIcon name="i-lucide-instagram" class="size-4" /> {{ contacts.instagram }}
          </a>
          <a v-if="contacts.phone" :href="`tel:${contacts.phone}`" class="inline-flex items-center gap-1 hover:opacity-70">
            <UIcon name="i-lucide-phone" class="size-4" /> {{ contacts.phone }}
          </a>
          <a v-if="contacts.whatsapp" :href="`https://wa.me/${contacts.whatsapp.replace(/\D/g, '')}`" target="_blank" class="inline-flex items-center gap-1 hover:opacity-70">
            <UIcon name="i-lucide-message-circle" class="size-4" /> WhatsApp
          </a>
          <a v-if="contacts.telegram" :href="`https://t.me/${contacts.telegram.replace(/^@/, '')}`" target="_blank" class="inline-flex items-center gap-1 hover:opacity-70">
            <UIcon name="i-lucide-send" class="size-4" /> {{ contacts.telegram }}
          </a>
          <a v-if="contacts.tiktok" :href="`https://tiktok.com/@${contacts.tiktok.replace(/^@/, '')}`" target="_blank" class="inline-flex items-center gap-1 hover:opacity-70">
            <UIcon name="i-lucide-music-2" class="size-4" /> TikTok
          </a>
        </div>
        <NuxtLink :to="site" class="text-caption sf-muted hover:sf-muted">{{ $t('shop.poweredByFull') }}</NuxtLink>
      </div>
    </footer>

    <!-- быстрый просмотр товара -->
    <UModal v-model:open="quickOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div v-if="quick" :style="styleVars" class="p-5 sm:p-6" style="background: var(--shop-bg)">
          <div class="flex justify-end -mt-1 -mr-1">
            <button class="p-1.5 sf-muted hover:opacity-70" :aria-label="$t('shop.quick.close')" @click="quick = null">
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <div class="grid sm:grid-cols-2 gap-5">
            <div class="aspect-[3/4] rounded-xl overflow-hidden sf-surface border sf-bord">
              <img v-if="quick.preview_url" :src="quick.preview_url" :alt="quick.title" class="w-full h-full object-contain">
              <div v-else class="w-full h-full flex items-center justify-center sf-muted"><UIcon name="i-lucide-shirt" class="size-12" /></div>
            </div>
            <div class="flex flex-col min-w-0">
              <h2 class="text-xl font-bold" style="color: var(--shop-primary)">{{ quick.title }}</h2>
              <p v-if="quick.description" class="text-sm sf-muted mt-2 whitespace-pre-line">{{ quick.description }}</p>

              <div v-if="hasSizes(quick)" class="mt-4 space-y-2">
                <div v-if="hasColors(quick)" class="flex flex-wrap gap-1.5">
                  <button
                    v-for="c in colorsOf(quick)"
                    :key="c.hex"
                    type="button"
                    :title="c.name"
                    class="size-7 rounded-full border-2 transition-transform hover:scale-110"
                    :style="{ backgroundColor: c.hex, borderColor: selVariant(quick)?.color_hex === c.hex ? 'var(--shop-primary)' : 'var(--shop-border)' }"
                    @click="pickColor(quick, c.hex)"
                  />
                </div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="v in sizesOf(quick)"
                    :key="v.id"
                    type="button"
                    :disabled="!v.in_stock"
                    class="min-w-9 px-2.5 py-1.5 rounded-md border text-sm font-medium transition-colors"
                    :class="!v.in_stock ? 'opacity-40 line-through cursor-not-allowed' : ''"
                    :style="{ borderColor: sel[quick.id] === v.id ? 'var(--shop-primary)' : 'var(--shop-border)', color: sel[quick.id] === v.id ? 'var(--shop-primary)' : undefined }"
                    @click="pickSize(quick, v.id)"
                  >{{ v.size }}</button>
                </div>
              </div>

              <div class="mt-auto pt-5 flex items-center justify-between gap-3">
                <span class="text-lg font-bold" style="color: var(--shop-primary)">{{ fmtPrice(quick.price) }}</span>
                <div class="flex items-center gap-2">
                  <button
                    class="p-2 rounded-lg border sf-bord sf-muted hover:opacity-80"
                    :title="$t('shop.buy.share')"
                    @click="shareItem(quick)"
                  >
                    <UIcon name="i-lucide-share-2" class="size-4" />
                  </button>
                  <button
                    class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    :style="{ background: 'var(--shop-primary)', color: 'var(--shop-on-primary)', borderRadius: 'var(--shop-radius)' }"
                    :disabled="adding === quick.id || !canAdd(quick)"
                    @click="addFromQuick"
                  >
                    <UIcon :name="adding === quick.id ? 'i-lucide-loader-2' : 'i-lucide-shopping-cart'" :class="['size-4', adding === quick.id ? 'animate-spin' : '']" />
                    {{ canAdd(quick) ? $t('shop.buy.add') : $t('shop.buy.soldOut') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Токены темы витрины (свет/тьма) — заменяют хардкод ink-gray/white/black-границы,
   чтобы витрина корректно читалась и в тёмной теме. */
.sf-muted { color: var(--shop-muted); }
.sf-surface { background: var(--shop-surface); }
.sf-bord { border-color: var(--shop-border); }
</style>
