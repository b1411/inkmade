<script setup lang="ts">
import type { ProductFit, SizeChartRow } from '~~/shared/config/zones'

// Страница товара (§6, §7.1). Выбор материала определяет метод/зоны (§5.2.1, F1-11).
const { t, locale } = useI18n()
const route = useRoute()
const slug = route.params.id as string
const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
const { getBySlug, listByCategory } = useCatalog()

const { data: product, error } = await useAsyncData(`product-${slug}`, () => getBySlug(slug))

if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: t('product.notFound') })
}

// Посадка и замеры (§42.1, миграция 0088). Обе колонки nullable: пока не заполнены,
// блок скрыт, а размерная сетка падает на ориентировочную с оговоркой. Пустой объект
// fit ({}) валиден по CHECK, поэтому проверяем НАЛИЧИЕ полей, а не самого объекта —
// иначе на карточке висел бы пустой заголовок «Посадка» без содержимого.
const fit = computed(() => (product.value?.fit ?? null) as ProductFit | null)
const hasFit = computed(() => {
  const f = fit.value
  if (!f) return false
  return !!(f.label || f.recommendation || f.composition || f.densityGsm || f.care || f.shrinkage
    || f.model?.heightCm || f.model?.wornSize || f.model?.chestCm)
})
const sizeChart = computed(() => (product.value?.size_chart ?? null) as SizeChartRow[] | null)

// похожие товары той же категории (кроме текущего), до 4 штук
const { data: related } = await useAsyncData(`related-${slug}`, async () => {
  const list = await listByCategory(product.value!.category)
  return (list ?? []).filter(p => p.id !== product.value!.id).slice(0, 4)
})

// og:image ОБЯЗАН быть растром: SVG-мокапы краулеры соцсетей (WhatsApp/Telegram/FB)
// не рендерят → битое превью. Берём primary если он растровый, иначе первый растровый
// снимок, иначе брендовый дефолт сайта (аудит 2026-07-12 #6). twitterImage тоже
// переопределяем per-page — иначе X показывает общий og-default вместо фото товара.
const productImgs = product.value.product_images ?? []
const isRaster = (u?: string | null): u is string => !!u && !u.toLowerCase().endsWith('.svg')
const primaryImg = productImgs.find(i => i.is_primary)?.url ?? productImgs[0]?.url
const ogImage = isRaster(primaryImg)
  ? primaryImg
  : (productImgs.map(i => i.url).find(isRaster) ?? `${site}/og-default.jpg`)
useSeoMeta({
  title: t('product.metaTitle', { title: product.value.title }),
  description: product.value.description || t('product.metaDescription', { title: product.value.title }),
  ogTitle: t('product.metaTitle', { title: product.value.title }),
  ogDescription: product.value.description || t('product.ogDescriptionFallback', { title: product.value.title }),
  ogImage,
  twitterImage: ogImage,
  twitterCard: 'summary_large_image',
})

// Product JSON-LD (P3.20) — структурированные данные для поиска/соцпревью.
const priceFromLd = computed(() =>
  product.value!.base_price + (product.value!.materials[0]?.surcharge ?? 0),
)
useHead({
  // og:type=product — валидный тип OpenGraph, но не входит в типовой union useSeoMeta,
  // поэтому задаём через meta (P3.20 SEO/соцпревью карточки товара).
  meta: [{ property: 'og:type', content: 'product' }],
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
onMounted(() => useAnalytics().productView(product.value!.id))

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

const selectedVariant = computed(() => product.value!.variants.find(variant =>
  variant.material_id === selectedMaterialId.value
  && variant.color_hex === selectedColor.value
  && variant.size === selectedSize.value
))

const priceFrom = computed(() =>
  product.value!.base_price + (selectedMaterial.value?.surcharge ?? 0),
)

// ссылка в конструктор с выбранным вариантом (§7.1): материал/цвет/размер едут
// в query, чтобы конструктор открылся на выбранном варианте, а не в дефолте.
// URLSearchParams кодирует '#' цвета как %23 — фрагмент URL не ломается.
const customizeTo = computed(() => {
  if (!product.value?.alias) return ''
  const q = new URLSearchParams()
  if (selectedMaterialId.value) q.set('material', selectedMaterialId.value)
  if (selectedColor.value) q.set('color', selectedColor.value)
  if (selectedSize.value) q.set('size', selectedSize.value)
  const qs = q.toString()
  return `/customize/${product.value.alias}${qs ? `?${qs}` : ''}`
})

// Галерея по выбранному цвету (фото-слоты, миграция 0044):
// mockup выбранного цвета + общие mockup; fallback на все фото для старых товаров.
const byPrimary = (a: { is_primary: boolean; sort_order: number }, b: { is_primary: boolean; sort_order: number }) =>
  Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
// скрытые фото (is_hidden) покупателю не показываем
interface GalleryImage {
  id: string
  url: string
  alt: string | null
  label: string | null
  kind: string
  color_hex: string | null
  is_primary: boolean
  sort_order: number
}
const visibleImages = computed<GalleryImage[]>(() => product.value!.product_images
  .filter(i => !i.is_hidden)
  .map(i => ({
    id: i.id,
    url: i.url,
    alt: i.alt,
    label: i.label,
    kind: i.kind,
    color_hex: i.color_hex,
    is_primary: i.is_primary,
    sort_order: i.sort_order
  })))

const localMockup = computed<GalleryImage | null>(() => {
  const hex = selectedColor.value.toLowerCase()
  const isBlack = ['#000', '#000000', '#111', '#111111', '#111214'].includes(hex)
  const isWhite = ['#fff', '#ffffff', '#f0ede7', '#f5f2eb'].includes(hex)
  const isBurgundy = ['#7e1f2d', '#801b2b', '#8f1d2c'].includes(hex)
  let url = ''

  if (slug === 'tshirt') {
    if (isBlack) url = '/media/products/blank/classic-black-v01.webp'
    if (isWhite) url = '/media/products/blank/classic-v01.webp'
  }
  if (slug === 'tshirt_oversize') {
    if (isBlack) url = '/media/products/blank/oversize-v01.webp'
    if (isWhite) url = '/media/products/blank/oversize-white-v01.webp'
    if (isBurgundy) url = '/media/products/blank/oversize-burgundy-v01.webp'
  }
  if (slug === 'cap' && isBlack) url = '/media/products/blank/cap-v01.webp'
  if (slug === 'polo' && isBlack) url = '/media/products/blank/polo-v01.webp'
  if (!url) return null

  return {
    id: `local-${slug}-${hex}`,
    url,
    alt: product.value!.title,
    label: t('product.photoNumber', { n: 1 }),
    kind: 'mockup',
    color_hex: selectedColor.value,
    is_primary: true,
    sort_order: -1
  }
})
const mockupImages = computed(() => {
  if (localMockup.value) return [localMockup.value]
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

function zoneOverlayStyle(zone: { title: string; name: string }) {
  const label = `${zone.title} ${zone.name}`.toLowerCase()
  if (label.includes('лев') || label.includes('left')) {
    return { left: '12%', top: '34%', width: '23%', height: '22%' }
  }
  if (label.includes('прав') || label.includes('right')) {
    return { right: '12%', top: '34%', width: '23%', height: '22%' }
  }
  if (label.includes('спин') || label.includes('back')) {
    return { left: '50%', top: '29%', width: '40%', height: '44%', transform: 'translateX(-50%)' }
  }
  return { left: '50%', top: '31%', width: '38%', height: '40%', transform: 'translateX(-50%)' }
}

const productCopy = computed(() => locale.value === 'kk'
  ? {
      available: 'Қоймада бар',
      benefits: [
        ['i-lucide-badge-check', 'Премиум негіз', 'Тығыз мата және сапалы тігіс'],
        ['i-lucide-sparkles', 'Төзімді принт', 'Түсін және айқындығын сақтайды'],
        ['i-lucide-map-pin', 'Алматыда жасалған', 'Өндіріс пен баспа бір жерде'],
        ['i-lucide-truck', 'Қазақстан бойынша', 'Трек-нөмірі бар жеткізу']
      ],
      detailsLabel: 'Өнім туралы',
      description: 'Сипаттама',
      specs: 'Сипаттамалар',
      material: 'Материал',
      fabric: 'Мата',
      method: 'Басып шығару',
      density: 'Тығыздық',
      fit: 'Пішім',
      zonesLabel: 'Баспа аймақтары',
      zonesTitle: 'Дизайныңа арналған кеңістік.',
      maxPrint: 'Макс. баспа',
      dpi: 'Мин. ажыратымдылық',
      openEditor: 'Редакторда тексеру'
    }
  : {
      available: 'В наличии',
      benefits: [
        ['i-lucide-badge-check', 'Премиальная основа', 'Плотная ткань и аккуратный пошив'],
        ['i-lucide-sparkles', 'Стойкий принт', 'Сохраняет цвет и детализацию'],
        ['i-lucide-map-pin', 'Сделано в Алматы', 'Производство и печать в одном месте'],
        ['i-lucide-truck', 'По Казахстану', 'Доставка с трек-номером']
      ],
      detailsLabel: 'О товаре',
      description: 'Описание',
      specs: 'Характеристики',
      material: 'Материал',
      fabric: 'Ткань',
      method: 'Печать',
      density: 'Плотность',
      fit: 'Посадка',
      zonesLabel: 'Зоны печати',
      zonesTitle: 'Пространство для твоего дизайна.',
      maxPrint: 'Макс. принт',
      dpi: 'Мин. разрешение',
      openEditor: 'Проверить в редакторе'
    })
</script>

<template>
  <div v-if="product" class="space-y-16">
    <section class="grid md:grid-cols-2 gap-10 items-start">
    <!-- галерея (§6.2): крупное фото с зум-лупой к курсору + crossfade при смене -->
    <div class="space-y-3">
      <!-- Warm Card под изолированным фото (§3.3 «product isolated media»): у наших
           кадров запечён белый фон, и на Ink Black они били бы белым прямоугольником. -->
      <div
        class="group relative aspect-square rounded-sm overflow-hidden bg-ink-card ring-1 ring-[var(--ink-line)]"
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
          <div v-else class="w-full h-full flex items-center justify-center text-ink-text-dark/25">
            <UIcon name="i-lucide-image" class="size-12" />
          </div>
        </Transition>
        <!-- метка ракурса текущего фото -->
        <span
          v-if="allImages[activeImage]?.label"
          class="absolute bottom-2 left-2 ink-label bg-ink-black/70 text-ink-bone px-2 py-1 rounded-xs"
        >{{ allImages[activeImage]!.label }}</span>
      </div>

      <!-- миниатюры: изделие -->
      <div v-if="mockupImages.length > 1" class="flex gap-2 flex-wrap">
        <button
          v-for="(img, i) in mockupImages"
          :key="img.id"
          class="size-16 rounded-md overflow-hidden border-2 transition-colors"
          :class="i === activeImage ? 'border-ink-burgundy' : 'border-[var(--ink-line-strong)] hover:border-ink-text-muted'"
          :aria-label="img.label || $t('product.photoNumber', { n: i + 1 })"
          @click="activeImage = i"
        >
          <NuxtImg :src="img.url" alt="" class="w-full h-full object-cover" sizes="64px" loading="lazy" />
        </button>
      </div>

      <!-- миниатюры: на людях -->
      <div v-if="lifestyleImages.length">
        <p class="ink-label text-ink-text-muted mb-2">{{ $t('product.lifestyle') }}</p>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="(img, i) in lifestyleImages"
            :key="img.id"
            class="size-16 rounded-md overflow-hidden border-2 transition-colors"
            :class="mockupImages.length + i === activeImage ? 'border-ink-burgundy' : 'border-[var(--ink-line-strong)] hover:border-ink-text-muted'"
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
        <!-- Было text-ink-gray-500 / -700 — таких токенов в теме нет (есть 900/600/400/200/50),
             classes молча не генерировались и цвет наследовался. Ставим существующие. -->
        <nav class="flex items-center gap-1.5 text-caption text-ink-text-muted mb-2" :aria-label="$t('product.breadcrumb')">
          <NuxtLink to="/catalog" class="hover:text-ink-burgundy transition-colors">{{ $t('catalog.pageTitle') }}</NuxtLink>
          <span aria-hidden="true">/</span>
          <span class="text-ink-text-soft truncate">{{ product.title }}</span>
        </nav>
        <UiSectionLabel accent>{{ product.category }}</UiSectionLabel>
        <h1 class="ink-display text-h1 mt-2">{{ product.title }}</h1>
        <p class="text-h3 mt-2 text-ink-burgundy font-bold">{{ $t('product.priceFrom', { price: formatPrice(priceFrom) }) }}</p>
      </div>

      <p v-if="product.description" class="text-ink-text-soft">{{ product.description }}</p>

      <!-- Посадка (§42.1). Каждая строка рисуется только если заполнена: спека
           перечисляет 10 полей, но требовать их все разом = не показать ничего. -->
      <div v-if="hasFit" class="rounded-md border border-[var(--ink-line)] p-4 space-y-2">
        <UiSectionLabel>{{ $t('product.fit.label') }}</UiSectionLabel>
        <dl class="text-caption space-y-1.5 mt-2">
          <div v-if="fit!.model?.heightCm" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.model') }}</dt>
            <dd class="text-ink-text">
              {{ $t('product.fit.heightCm', { n: fit!.model.heightCm }) }}<template v-if="fit!.model?.chestCm">, {{ $t('product.fit.chestCm', { n: fit!.model.chestCm }) }}</template>
            </dd>
          </div>
          <div v-if="fit!.model?.wornSize" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.wornSize') }}</dt>
            <dd class="text-ink-text">{{ fit!.model.wornSize }}</dd>
          </div>
          <div v-if="fit!.label" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.fitLabel') }}</dt>
            <dd class="text-ink-text">{{ fit!.label }}</dd>
          </div>
          <div v-if="fit!.composition" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.composition') }}</dt>
            <dd class="text-ink-text">{{ fit!.composition }}</dd>
          </div>
          <div v-if="fit!.densityGsm" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.density') }}</dt>
            <dd class="text-ink-text">{{ $t('product.fit.gsm', { n: fit!.densityGsm }) }}</dd>
          </div>
          <div v-if="fit!.care" class="flex gap-2">
            <dt class="text-ink-text-muted shrink-0">{{ $t('product.fit.care') }}</dt>
            <dd class="text-ink-text">{{ fit!.care }}</dd>
          </div>
        </dl>
        <p v-if="fit!.recommendation" class="text-caption text-ink-text-soft pt-1">{{ fit!.recommendation }}</p>
        <p v-if="fit!.shrinkage" class="text-caption text-ink-warning">{{ fit!.shrinkage }}</p>
      </div>

      <!-- материал определяет метод/зоны (§5.2.1) -->
      <div v-if="product.materials.length">
        <UiSectionLabel>{{ $t('product.material') }}</UiSectionLabel>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="m in product.materials"
            :key="m.id"
            class="px-3 py-2 rounded-xs border text-caption transition-colors"
            :class="m.id === selectedMaterialId
              ? 'border-ink-burgundy bg-ink-burgundy text-ink-bone'
              : 'border-[var(--ink-line-strong)] text-ink-text-soft hover:border-ink-text-muted'"
            @click="selectedMaterialId = m.id"
          >
            {{ m.name }}
          </button>
        </div>
        <p v-if="selectedMaterial" class="text-caption text-ink-text-muted mt-2">
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
            :class="c.hex === selectedColor ? 'border-ink-bone' : 'border-[var(--ink-line-strong)]'"
            :style="{ backgroundColor: c.hex }"
            @click="selectedColor = c.hex"
          />
        </div>
      </div>

      <!-- размер -->
      <div v-if="sizes.length">
        <div class="flex items-center justify-between gap-2">
          <UiSectionLabel>{{ $t('product.size') }}</UiSectionLabel>
          <!-- Передаём реальные размеры: гайд не должен предлагать то, чего нет
               в продаже, и не должен вылезать у товара с единственным размером. -->
          <CatalogSizeGuide :sizes="sizes" :chart="sizeChart" />
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="s in sizes"
            :key="s"
            class="min-w-11 px-3 py-2 rounded-xs border text-center transition-colors"
            :class="s === selectedSize
              ? 'border-ink-burgundy bg-ink-burgundy text-ink-bone'
              : 'border-[var(--ink-line-strong)] text-ink-text-soft hover:border-ink-text-muted'"
            @click="selectedSize = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div v-if="selectedVariant?.stock" class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/55">
        <span class="size-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.7)]" />
        {{ productCopy.available }} · {{ selectedVariant.stock }}
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
            :to="customizeTo"
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
      <!-- Panel (§3.3), а не UAlert: --ui-* у нас принудительно светлые (main.css),
           поэтому UAlert рисовал светло-серую плашку посреди Ink Black-страницы.
           Инпуты/селекты так оставлены сознательно — светлый контрол на тёмном
           читается как контрол; а вот текстовая сноска обязана жить в среде. -->
      <div class="flex items-start gap-3 rounded-md bg-ink-panel border border-[var(--ink-line)] p-4">
        <UIcon name="i-lucide-info" class="size-5 shrink-0 text-ink-text-muted mt-0.5" />
        <div>
          <p class="font-semibold text-ink-text">{{ $t('product.colorNote.title') }}</p>
          <p class="text-caption text-ink-text-soft mt-1">{{ $t('product.colorNote.description') }}</p>
        </div>
      </div>
    </div>
    </section>

    <section class="grid border-y border-white/10 md:grid-cols-2 lg:grid-cols-4" aria-label="Преимущества товара">
      <div v-for="(benefit, index) in productCopy.benefits" :key="benefit[1]" class="flex gap-4 px-5 py-6" :class="index ? 'border-t border-white/10 md:border-l md:border-t-0' : ''">
        <UIcon :name="benefit[0]" class="mt-0.5 size-6 shrink-0 text-ink-burgundy-hover" />
        <div>
          <p class="text-sm font-bold">{{ benefit[1] }}</p>
          <p class="mt-1 text-xs leading-relaxed text-ink-text-muted">{{ benefit[2] }}</p>
        </div>
      </div>
    </section>

    <section class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark">
      <div class="mx-auto max-w-(--container-max) px-4 py-12 lg:py-16">
        <UiSectionLabel accent>01 / {{ productCopy.detailsLabel }}</UiSectionLabel>
        <div class="mt-6 grid gap-4 lg:grid-cols-3">
          <article class="border border-black/10 bg-ink-paper p-6 sm:p-8">
            <h2 class="ink-display text-2xl">{{ productCopy.description }}</h2>
            <p class="mt-5 leading-relaxed text-ink-text-dark-soft">
              {{ product.description || `${product.title} — чистая основа для персонального принта. Выбери цвет и размер, затем собери дизайн в редакторе.` }}
            </p>
            <ul class="mt-7 space-y-3 text-sm">
              <li v-for="item in productCopy.benefits.slice(0, 3)" :key="item[1]" class="flex items-center gap-3 border-t border-black/10 pt-3">
                <UIcon :name="item[0]" class="size-4 text-ink-burgundy" />
                {{ item[1] }}
              </li>
            </ul>
          </article>

          <article class="border border-black/10 bg-ink-paper p-6 sm:p-8">
            <h2 class="ink-display text-2xl">{{ productCopy.specs }}</h2>
            <dl class="mt-5 text-sm">
              <div class="flex justify-between gap-5 border-b border-black/10 py-3">
                <dt class="text-ink-text-dark-soft">{{ productCopy.material }}</dt>
                <dd class="text-right font-semibold">{{ selectedMaterial?.name || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-5 border-b border-black/10 py-3">
                <dt class="text-ink-text-dark-soft">{{ productCopy.fabric }}</dt>
                <dd class="text-right font-semibold">{{ fit?.composition || selectedMaterial?.fabric_type || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-5 border-b border-black/10 py-3">
                <dt class="text-ink-text-dark-soft">{{ productCopy.method }}</dt>
                <dd class="text-right font-semibold">{{ selectedMaterial ? $t(`domain.printMethod.${selectedMaterial.print_method}`) : '—' }}</dd>
              </div>
              <div v-if="fit?.densityGsm" class="flex justify-between gap-5 border-b border-black/10 py-3">
                <dt class="text-ink-text-dark-soft">{{ productCopy.density }}</dt>
                <dd class="text-right font-semibold">{{ fit.densityGsm }} GSM</dd>
              </div>
              <div v-if="fit?.label" class="flex justify-between gap-5 py-3">
                <dt class="text-ink-text-dark-soft">{{ productCopy.fit }}</dt>
                <dd class="text-right font-semibold">{{ fit.label }}</dd>
              </div>
            </dl>
          </article>

          <article class="relative min-h-[360px] overflow-hidden border border-black/10 bg-[#d9d5ce]">
            <NuxtImg :src="localMockup?.url || allImages[0]?.url" :alt="product.title" class="absolute inset-0 size-full object-cover" sizes="(max-width: 1023px) 100vw, 460px" loading="lazy" />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-6 pt-20 text-white">
              <p class="font-mono text-[10px] uppercase tracking-[.14em] text-white/55">INKMADE / BLANK 001</p>
              <p class="ink-display mt-2 text-3xl">{{ product.title }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="product.print_zones.length" aria-labelledby="print-zones-title">
      <div class="flex items-end justify-between gap-6">
        <div>
          <UiSectionLabel accent>02 / {{ productCopy.zonesLabel }}</UiSectionLabel>
          <h2 id="print-zones-title" class="ink-display mt-2 text-h2">{{ productCopy.zonesTitle }}</h2>
        </div>
        <div v-if="product.alias" class="hidden sm:block">
          <UiAppButton :to="customizeTo" variant="secondary" size="md" on-dark trailing-icon="i-lucide-arrow-right">
            {{ productCopy.openEditor }}
          </UiAppButton>
        </div>
      </div>
      <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="(zone, index) in product.print_zones" :key="zone.id" class="grid grid-cols-[42%_1fr] overflow-hidden border border-white/10 bg-ink-panel">
          <div class="relative min-h-52 bg-[#d9d5ce]">
            <NuxtImg :src="localMockup?.url || allImages[0]?.url" alt="" class="absolute inset-0 size-full object-cover" sizes="260px" loading="lazy" />
            <div class="absolute border border-dashed border-ink-burgundy bg-ink-burgundy/10" :style="zoneOverlayStyle(zone)" />
            <span class="absolute left-3 top-3 bg-ink-black px-2 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-white">0{{ index + 1 }}</span>
          </div>
          <div class="flex flex-col justify-between p-5">
            <div>
              <p class="font-display text-xl font-black uppercase">{{ zone.title }}</p>
              <p v-if="zone.placement_hint" class="mt-2 text-xs leading-relaxed text-ink-text-muted">{{ zone.placement_hint }}</p>
            </div>
            <dl class="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs">
              <div v-if="zone.max_width_mm && zone.max_height_mm" class="flex justify-between gap-3">
                <dt class="text-ink-text-muted">{{ productCopy.maxPrint }}</dt>
                <dd class="font-mono">{{ zone.max_width_mm }}×{{ zone.max_height_mm }} mm</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-ink-text-muted">{{ productCopy.dpi }}</dt>
                <dd class="font-mono">{{ zone.min_dpi }} DPI</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </section>

    <!-- похожие товары той же категории -->
    <section v-if="related?.length">
      <h2 class="ink-display text-h3 mb-6">{{ $t('product.related') }}</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <CatalogProductCard v-for="p in related" :key="p.id" :product="p" />
      </div>
    </section>
  </div>
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

