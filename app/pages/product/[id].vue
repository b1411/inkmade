<script setup lang="ts">

// Страница товара (§6, §7.1). Выбор материала определяет метод/зоны (§5.2.1, F1-11).
const { t } = useI18n()
const route = useRoute()
const slug = route.params.id as string
const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
const { getBySlug } = useCatalog()

const { data: product, error } = await useAsyncData(`product-${slug}`, () => getBySlug(slug))

if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: t('product.notFound') })
}

const ogImage = product.value.product_images?.find(i => i.is_primary)?.url ?? product.value.product_images?.[0]?.url
useSeoMeta({
  title: t('product.metaTitle', { title: product.value.title }),
  description: product.value.description || t('product.metaDescription', { title: product.value.title }),
  ogTitle: t('product.metaTitle', { title: product.value.title }),
  ogDescription: product.value.description || t('product.ogDescriptionFallback', { title: product.value.title }),
  ogImage,
  ogType: 'product',
})

// Product JSON-LD (P3.20) — структурированные данные для поиска/соцпревью.
const priceFromLd = computed(() =>
  product.value!.base_price + (product.value!.materials[0]?.surcharge ?? 0),
)
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: computed(() => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.value!.title,
      description: product.value!.description || t('product.ogDescriptionFallback', { title: product.value!.title }),
      image: ogImage ? [ogImage] : undefined,
      brand: { '@type': 'Brand', name: 'INKMADE' },
      productID: product.value!.id,
      url: `${site}/product/${slug}`,
      offers: {
        '@type': 'Offer',
        url: `${site}/product/${slug}`,
        price: priceFromLd.value,
        priceCurrency: 'KZT',
        availability: (product.value!.variants ?? []).some(v => v.stock > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    })),
  }],
})

// BreadcrumbList JSON-LD (P2 SEO): хлебные крошки в поисковой выдаче.
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'INKMADE', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: t('catalog.pageTitle'), item: `${site}/catalog` },
        { '@type': 'ListItem', position: 3, name: product.value!.title, item: `${site}/product/${slug}` },
      ],
    }),
  }],
})

// первое звено воронки — просмотр товара (§3.5.1)
onMounted(() => useAnalytics().viewContent(product.value!.id))

// избранное (CRM §3.1)
const { isProductFav, toggleProduct } = useFavorites()
const { isAuthenticated } = useAuth()
const toast = useToast()
const favId = ref<string | null>(null)
const favBusy = ref(false)
onMounted(async () => {
  if (isAuthenticated.value && product.value) favId.value = await isProductFav(product.value.id)
})
async function onToggleFav() {
  if (!isAuthenticated.value) { await navigateTo(`/login?redirect=/product/${slug}`); return }
  favBusy.value = true
  try {
    const added = await toggleProduct(product.value!.id)
    // храним реальный id строки избранного (не плейсхолдер) — на случай будущей логики
    favId.value = added ? await isProductFav(product.value!.id) : null
  } catch (e) {
    toast.add({ title: t('product.favError'), description: getFetchMessage(e), color: 'error' })
  } finally { favBusy.value = false }
}

// есть ли хоть один вариант в наличии (для состояния «нет в наличии»)
const anyInStock = computed(() => (product.value?.variants ?? []).some(v => v.stock > 0))

const selectedMaterialId = ref(product.value.materials[0]?.id ?? '')
const selectedMaterial = computed(() =>
  product.value!.materials.find(m => m.id === selectedMaterialId.value),
)

// варианты выбранного материала, в наличии (stock>0 скрываем нулевые, §8.2.4)
const materialVariants = computed(() =>
  product.value!.variants.filter(v => v.material_id === selectedMaterialId.value),
)
const colors = computed(() => {
  const map = new Map<string, { name: string; hex: string }>()
  for (const v of materialVariants.value) if (v.stock > 0) map.set(v.color_hex, { name: v.color_name, hex: v.color_hex })
  return [...map.values()]
})
const selectedColor = ref<string>('')
watch(colors, (c) => { if (c.length && !c.find(x => x.hex === selectedColor.value)) selectedColor.value = c[0]!.hex }, { immediate: true })

const sizes = computed(() =>
  materialVariants.value.filter(v => v.color_hex === selectedColor.value && v.stock > 0).map(v => v.size),
)
const selectedSize = ref<string>('')
watch(sizes, (s) => { if (s.length && !s.includes(selectedSize.value)) selectedSize.value = s[0]! }, { immediate: true })

const priceFrom = computed(() =>
  product.value!.base_price + (selectedMaterial.value?.surcharge ?? 0),
)

// Галерея по выбранному цвету (фото-слоты, миграция 0044):
// mockup выбранного цвета + общие mockup; fallback на все фото для старых товаров.
const byPrimary = (a: { is_primary: boolean; sort_order: number }, b: { is_primary: boolean; sort_order: number }) =>
  Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
// скрытые фото (is_hidden) покупателю не показываем
const visibleImages = computed(() => product.value!.product_images.filter(i => !i.is_hidden))
const mockupImages = computed(() => {
  const imgs = visibleImages.value
  const byColor = imgs.filter(i => i.kind === 'mockup' && i.color_hex === selectedColor.value)
  const common = imgs.filter(i => i.kind === 'mockup' && !i.color_hex)
  const combined = [...byColor, ...common]
  const list = combined.length ? combined : imgs.filter(i => i.kind === 'mockup')
  return [...(list.length ? list : imgs)].sort(byPrimary)
})
// lifestyle «на людях» — гибрид: фото этого цвета + общие
const lifestyleImages = computed(() => {
  const imgs = visibleImages.value
  const byColor = imgs.filter(i => i.kind === 'lifestyle' && i.color_hex === selectedColor.value)
  const common = imgs.filter(i => i.kind === 'lifestyle' && !i.color_hex)
  return [...byColor, ...common].sort((a, b) => a.sort_order - b.sort_order)
})
const allImages = computed(() => [...mockupImages.value, ...lifestyleImages.value])
const activeImage = ref(0)
// при смене цвета/состава галереи — на первое фото
watch([selectedColor, allImages], () => { activeImage.value = 0 })

// Зум-лупа к курсору на главном фото (§6.2): только desktop + не reduced-motion.
const prefersReduced = useReducedMotion()
const zooming = ref(false)
const zoomOrigin = ref('50% 50%')
function canZoom(): boolean {
  return import.meta.client && !prefersReduced.value && window.matchMedia('(pointer: fine)').matches
}
function onZoomMove(e: MouseEvent) {
  if (!zooming.value) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * 100
  const y = ((e.clientY - r.top) / r.height) * 100
  zoomOrigin.value = `${x}% ${y}%`
}
</script>

<template>
  <section v-if="product" class="grid md:grid-cols-2 gap-10 items-start">
    <!-- галерея (§6.2): крупное фото с зум-лупой к курсору + crossfade при смене -->
    <div class="space-y-3">
      <div
        class="group relative aspect-square rounded-lg overflow-hidden bg-ink-gray-50 shadow-sm ring-1 ring-ink-gray-200"
        :class="zooming ? 'cursor-zoom-in' : ''"
        @mouseenter="zooming = canZoom()"
        @mouseleave="zooming = false"
        @mousemove="onZoomMove"
      >
        <Transition name="img-fade" mode="out-in">
          <NuxtImg
            v-if="allImages[activeImage]"
            :key="allImages[activeImage]!.id"
            :src="allImages[activeImage]!.url"
            :alt="allImages[activeImage]!.alt || product.title"
            class="w-full h-full object-cover transition-transform duration-300 ease-out"
            :class="zooming ? 'scale-[1.9]' : 'scale-100'"
            :style="{ transformOrigin: zoomOrigin }"
            sizes="(max-width: 768px) 100vw, 560px"
            loading="eager"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
            <UIcon name="i-lucide-image" class="size-12" />
          </div>
        </Transition>
        <!-- метка ракурса текущего фото -->
        <span
          v-if="allImages[activeImage]?.label"
          class="absolute bottom-2 left-2 ink-label bg-ink-black/70 text-ink-cream px-2 py-1 rounded-sm"
        >{{ allImages[activeImage]!.label }}</span>
      </div>

      <!-- миниатюры: изделие -->
      <div v-if="mockupImages.length > 1" class="flex gap-2 flex-wrap">
        <button
          v-for="(img, i) in mockupImages"
          :key="img.id"
          class="size-16 rounded-md overflow-hidden border-2 transition-colors"
          :class="i === activeImage ? 'border-ink-burgundy' : 'border-ink-gray-200 hover:border-ink-gray-400'"
          :aria-label="img.label || $t('product.photoNumber', { n: i + 1 })"
          @click="activeImage = i"
        >
          <NuxtImg :src="img.url" alt="" class="w-full h-full object-cover" sizes="64px" loading="lazy" />
        </button>
      </div>

      <!-- миниатюры: на людях -->
      <div v-if="lifestyleImages.length">
        <p class="ink-label text-ink-gray-600 mb-2">{{ $t('product.lifestyle') }}</p>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="(img, i) in lifestyleImages"
            :key="img.id"
            class="size-16 rounded-md overflow-hidden border-2 transition-colors"
            :class="mockupImages.length + i === activeImage ? 'border-ink-burgundy' : 'border-ink-gray-200 hover:border-ink-gray-400'"
            :aria-label="$t('product.lifestyleNumber', { n: i + 1 })"
            @click="activeImage = mockupImages.length + i"
          >
            <NuxtImg :src="img.url" alt="" class="w-full h-full object-cover" sizes="64px" loading="lazy" />
          </button>
        </div>
      </div>
    </div>

    <!-- инфо + выбор (липнет на десктопе при прокрутке галереи) -->
    <div class="space-y-6 md:sticky md:top-24">
      <div>
        <UiSectionLabel accent>{{ product.category }}</UiSectionLabel>
        <h1 class="ink-display text-h1 mt-2">{{ product.title }}</h1>
        <p class="text-h3 mt-2 text-ink-burgundy font-bold">{{ $t('product.priceFrom', { price: formatPrice(priceFrom) }) }}</p>
      </div>

      <p v-if="product.description" class="text-ink-gray-600">{{ product.description }}</p>

      <!-- материал определяет метод/зоны (§5.2.1) -->
      <div v-if="product.materials.length">
        <UiSectionLabel>{{ $t('product.material') }}</UiSectionLabel>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="m in product.materials"
            :key="m.id"
            class="px-3 py-2 rounded-md border text-caption transition-colors"
            :class="m.id === selectedMaterialId ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
            @click="selectedMaterialId = m.id"
          >
            {{ m.name }}
          </button>
        </div>
        <p v-if="selectedMaterial" class="text-caption text-ink-gray-600 mt-2">
          {{ $t(`domain.printMethod.${selectedMaterial.print_method}`) }} ·
          {{ $t(`domain.printMode.${selectedMaterial.print_mode}`) }}
        </p>
      </div>

      <!-- цвет -->
      <div v-if="colors.length">
        <UiSectionLabel>{{ $t('product.color') }}</UiSectionLabel>
        <div class="flex gap-2 mt-2">
          <button
            v-for="c in colors"
            :key="c.hex"
            :title="c.name"
            class="size-9 rounded-full border-2 transition-transform hover:scale-110"
            :class="c.hex === selectedColor ? 'border-ink-burgundy' : 'border-ink-gray-200'"
            :style="{ backgroundColor: c.hex }"
            @click="selectedColor = c.hex"
          />
        </div>
      </div>

      <!-- размер -->
      <div v-if="sizes.length">
        <UiSectionLabel>{{ $t('product.size') }}</UiSectionLabel>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="s in sizes"
            :key="s"
            class="min-w-11 px-3 py-2 rounded-md border text-center transition-colors"
            :class="s === selectedSize ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
            @click="selectedSize = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- нет ни одного варианта в наличии -->
      <UAlert
        v-if="!anyInStock"
        color="warning"
        variant="subtle"
        icon="i-lucide-package-x"
        :title="$t('product.outOfStock.title')"
        :description="$t('product.outOfStock.description')"
      />

      <div class="flex items-center gap-2">
        <div class="flex-1">
          <UiAppButton
            v-if="product.alias"
            :to="`/customize/${product.alias}`"
            variant="primary"
            size="xl"
            icon="i-lucide-brush"
            :disabled="!anyInStock"
            magnetic
            block
          >
            {{ $t('product.goToConstructor') }}
          </UiAppButton>
          <UiAppButton v-else variant="secondary" size="xl" block disabled>
            {{ $t('product.noConstructor') }}
          </UiAppButton>
        </div>
        <UButton
          size="xl"
          :color="favId ? 'primary' : 'neutral'"
          :variant="favId ? 'subtle' : 'outline'"
          icon="i-lucide-heart"
          :loading="favBusy"
          :aria-label="$t('product.addToFav')"
          @click="onToggleFav"
        />
      </div>

      <!-- дисклеймер расхождения цвета (§7.3, §10) -->
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        :title="$t('product.colorNote.title')"
        :description="$t('product.colorNote.description')"
      />
    </div>
  </section>
</template>

<style scoped>
/* Crossfade главного фото галереи (§6.2) */
.img-fade-enter-active,
.img-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.img-fade-enter-from,
.img-fade-leave-to {
  opacity: 0;
}
</style>

