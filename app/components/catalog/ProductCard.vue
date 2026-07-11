<script setup lang="ts">
// Единая карточка товара (§6.1): фото на нейтральном фоне (NuxtImg WebP/lazy),
// смена ракурса front→back по hover (crossfade), подъём (AppCard), «от N ₸»,
// проявляющаяся подсказка «Открыть» (карточка ведёт на страницу товара, не в конструктор).
// Переиспользуется в каталоге и кабинете.
interface ProductImage {
  url: string
  is_primary: boolean
}
interface Product {
  id: string
  slug: string
  title: string
  base_price: number
  created_at?: string | null
  product_images?: ProductImage[]
}
// badge — ручная метка (приоритет); иначе авто «Новинка» по дате создания (≤14 дней).
const props = defineProps<{ product: Product; badge?: string }>()
const { t } = useI18n()

const images = computed(() => props.product.product_images ?? [])
const primary = computed(() => images.value.find(i => i.is_primary)?.url ?? images.value[0]?.url)
const secondary = computed(() => images.value.map(i => i.url).find(u => u !== primary.value))

const isNew = computed(() => {
  const created = props.product.created_at
  if (!created) return false
  return Date.now() - new Date(created).getTime() < 14 * 24 * 60 * 60 * 1000
})
const badgeLabel = computed(() => props.badge ?? (isNew.value ? t('catalog.card.new') : null))
</script>

<template>
  <UiAppCard :to="`/product/${product.slug}`" hover class="group h-full">
    <div class="app-card-media relative aspect-4/5 bg-ink-gray-50">
      <NuxtImg
        v-if="primary"
        :src="primary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-contain transition-[opacity,transform] duration-500"
        :class="secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <NuxtImg
        v-if="secondary"
        :src="secondary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-contain opacity-0 scale-105 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-500"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <div v-if="!primary" class="absolute inset-0 flex items-center justify-center text-ink-gray-400">
        <UIcon name="i-lucide-image" class="size-10" />
      </div>

      <!-- Бейдж «Новинка» / ручная метка -->
      <span
        v-if="badgeLabel"
        class="absolute top-3 left-3 z-10 ink-label rounded-full bg-ink-burgundy/95 text-ink-cream px-2.5 py-1 shadow-sm backdrop-blur-sm"
      >{{ badgeLabel }}</span>

      <!-- Подсказка действия — проявляется по hover (десктоп) -->
      <div
        class="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
      >
        <span class="block w-full text-center rounded-full bg-ink-burgundy text-ink-cream text-sm font-semibold py-2.5">
          {{ $t('catalog.card.open') }}
        </span>
      </div>
    </div>
    <div class="p-4">
      <p class="font-semibold group-hover:text-ink-burgundy transition-colors">{{ product.title }}</p>
      <p class="text-ink-gray-600 mt-1">{{ $t('catalog.card.priceFrom', { price: formatPrice(product.base_price) }) }}</p>
    </div>
  </UiAppCard>
</template>
