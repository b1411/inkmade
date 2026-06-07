<script setup lang="ts">
import type { PrintMethod, PrintMode } from '~~/shared/config/print-methods'
import { PRINT_METHOD_LABELS, PRINT_MODE_LABELS } from '~~/shared/config/print-methods'

// Страница товара (§6, §7.1). Выбор материала определяет метод/зоны (§5.2.1, F1-11).
const route = useRoute()
const slug = route.params.id as string
const { getBySlug } = useCatalog()

const { data: product, error } = await useAsyncData(`product-${slug}`, () => getBySlug(slug))

if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Товар не найден' })
}

const ogImage = product.value.product_images?.find(i => i.is_primary)?.url ?? product.value.product_images?.[0]?.url
useSeoMeta({
  title: `${product.value.title} — INKMADE`,
  description: product.value.description || `${product.value.title}: кастомизируй принт в браузере и закажи от одной штуки — INKMADE.`,
  ogTitle: `${product.value.title} — INKMADE`,
  ogDescription: product.value.description || `${product.value.title} с печатью вашего принта.`,
  ogImage,
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
      description: product.value!.description || `${product.value!.title} с печатью вашего принта.`,
      image: ogImage ? [ogImage] : undefined,
      brand: { '@type': 'Brand', name: 'INKMADE' },
      offers: {
        '@type': 'Offer',
        price: priceFromLd.value,
        priceCurrency: 'KZT',
        availability: 'https://schema.org/InStock',
      },
    })),
  }],
})

// первое звено воронки — просмотр товара (§3.5.1)
onMounted(() => useAnalytics().viewContent(product.value!.id))

// избранное (CRM §3.1)
const { isProductFav, toggleProduct } = useFavorites()
const { isAuthenticated } = useAuth()
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
    favId.value = added ? 'x' : null
  } finally { favBusy.value = false }
}

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

const gallery = computed(() => {
  const imgs = [...product.value!.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
  return imgs
})
const activeImage = ref(0)
</script>

<template>
  <section v-if="product" class="grid md:grid-cols-2 gap-10">
    <!-- галерея -->
    <div class="space-y-3">
      <div class="aspect-square rounded-lg overflow-hidden bg-ink-gray-200">
        <img v-if="gallery[activeImage]" :src="gallery[activeImage]!.url" :alt="product.title" class="w-full h-full object-cover">
        <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
          <UIcon name="i-lucide-image" class="size-12" />
        </div>
      </div>
      <div v-if="gallery.length > 1" class="flex gap-2">
        <button
          v-for="(img, i) in gallery"
          :key="img.id"
          class="size-16 rounded-md overflow-hidden border-2"
          :class="i === activeImage ? 'border-ink-burgundy' : 'border-transparent'"
          @click="activeImage = i"
        >
          <img :src="img.url" alt="" class="w-full h-full object-cover">
        </button>
      </div>
    </div>

    <!-- инфо + выбор -->
    <div class="space-y-6">
      <div>
        <UiSectionLabel accent>{{ product.category }}</UiSectionLabel>
        <h1 class="ink-display text-h2 mt-2">{{ product.title }}</h1>
        <p class="text-h3 mt-2 text-ink-burgundy font-bold">от {{ priceFrom }} ₸</p>
      </div>

      <p v-if="product.description" class="text-ink-gray-600">{{ product.description }}</p>

      <!-- материал определяет метод/зоны (§5.2.1) -->
      <div v-if="product.materials.length">
        <UiSectionLabel>Материал</UiSectionLabel>
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
          {{ PRINT_METHOD_LABELS[selectedMaterial.print_method as PrintMethod] }} ·
          {{ PRINT_MODE_LABELS[selectedMaterial.print_mode as PrintMode] }}
        </p>
      </div>

      <!-- цвет -->
      <div v-if="colors.length">
        <UiSectionLabel>Цвет</UiSectionLabel>
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
        <UiSectionLabel>Размер</UiSectionLabel>
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

      <div class="flex gap-2">
        <UButton
          v-if="product.alias"
          :to="`/customize/${product.alias}`"
          color="primary"
          size="xl"
          icon="i-lucide-brush"
          class="flex-1"
          block
        >
          Создать свой принт
        </UButton>
        <UButton
          size="xl"
          :color="favId ? 'primary' : 'neutral'"
          :variant="favId ? 'subtle' : 'outline'"
          :icon="favId ? 'i-lucide-heart' : 'i-lucide-heart'"
          :loading="favBusy"
          aria-label="В избранное"
          @click="onToggleFav"
        />
      </div>

      <!-- дисклеймер расхождения цвета (§7.3, §10) -->
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="О цвете"
        description="Цвет на экране может отличаться от напечатанного. Финальный цвет согласует оператор перед печатью."
      />
    </div>
  </section>
</template>
