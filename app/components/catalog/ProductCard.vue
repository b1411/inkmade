<script setup lang="ts">
// Единая карточка товара (§6.1): фото на нейтральном фоне (NuxtImg WebP/lazy),
// смена ракурса front→back по hover (crossfade), подъём (AppCard), «от N ₸»,
// проявляющаяся подсказка «Кастомизировать». Переиспользуется в каталоге и кабинете.
interface ProductImage {
  url: string
  is_primary: boolean
}
interface Product {
  id: string
  slug: string
  title: string
  base_price: number
  product_images?: ProductImage[]
}
const props = defineProps<{ product: Product }>()

const images = computed(() => props.product.product_images ?? [])
const primary = computed(() => images.value.find(i => i.is_primary)?.url ?? images.value[0]?.url)
const secondary = computed(() => images.value.map(i => i.url).find(u => u !== primary.value))
</script>

<template>
  <UiAppCard :to="`/product/${product.slug}`" hover class="group h-full">
    <div class="app-card-media relative aspect-4/5 bg-ink-gray-50">
      <NuxtImg
        v-if="primary"
        :src="primary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        :class="secondary ? 'group-hover:opacity-0' : ''"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <NuxtImg
        v-if="secondary"
        :src="secondary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <div v-if="!primary" class="absolute inset-0 flex items-center justify-center text-ink-gray-400">
        <UIcon name="i-lucide-image" class="size-10" />
      </div>

      <!-- Подсказка действия — проявляется по hover (десктоп) -->
      <div
        class="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
      >
        <span class="block w-full text-center rounded-full bg-ink-burgundy text-ink-cream text-sm font-semibold py-2.5">
          Кастомизировать
        </span>
      </div>
    </div>
    <div class="p-4">
      <p class="font-semibold group-hover:text-ink-burgundy transition-colors">{{ product.title }}</p>
      <p class="text-ink-gray-600 mt-1">от {{ product.base_price }} ₸</p>
    </div>
  </UiAppCard>
</template>
