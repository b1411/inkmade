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
const localPrimary: Record<string, string> = {
  tshirt: '/media/products/blank/classic-v01.webp',
  tshirt_oversize: '/media/products/blank/oversize-v01.webp',
  cap: '/media/products/blank/cap-v01.webp',
  polo: '/media/products/blank/polo-v01.webp',
  sweatshirt: '/media/products/blank/sweatshirt-v01.webp',
  hoodie: '/media/products/blank/hoodie-v01.webp',
  tote: '/media/products/blank/tote-v01.webp',
}
const localSecondary: Record<string, string> = {
  tshirt: '/media/products/back/classic-back-v01.webp',
  tshirt_oversize: '/media/products/back/oversize-back-v01.webp',
  cap: '/media/products/back/cap-back-v01.webp',
  polo: '/media/products/back/polo-back-v01.webp',
  sweatshirt: '/media/products/back/sweatshirt-back-v01.webp',
  hoodie: '/media/products/back/hoodie-back-v01.webp',
  tote: '/media/products/back/tote-back-v01.webp',
}
const productMeta: Record<string, { fit: string; gsm: string; colors: string[] }> = {
  tshirt_oversize: { fit: 'Oversize', gsm: '240 GSM', colors: ['#111111', '#f3f0eb', '#7e1f2d'] },
  tshirt: { fit: 'Regular', gsm: '220 GSM', colors: ['#111111', '#f3f0eb', '#8e8a84'] },
  polo: { fit: 'Relaxed', gsm: '220 GSM', colors: ['#111111', '#f3f0eb'] },
  sweatshirt: { fit: 'Relaxed', gsm: '320 GSM', colors: ['#111111', '#8e8a84', '#7e1f2d'] },
  hoodie: { fit: 'Oversize', gsm: '340 GSM', colors: ['#111111', '#8e8a84', '#7e1f2d'] },
  cap: { fit: 'One size', gsm: 'Twill', colors: ['#111111', '#f3f0eb', '#8e8a84'] },
  tote: { fit: 'One size', gsm: '320 GSM', colors: ['#111111'] },
}
const meta = computed(() => productMeta[props.product.slug])
const remotePrimary = computed(() => images.value.find(i => i.is_primary)?.url ?? images.value[0]?.url)
const primary = computed(() => localPrimary[props.product.slug] ?? remotePrimary.value)
const secondary = computed(() => localSecondary[props.product.slug]
  ?? images.value.map(i => i.url).find(u => u !== remotePrimary.value))

const isNew = computed(() => {
  const created = props.product.created_at
  if (!created) return false
  return Date.now() - new Date(created).getTime() < 14 * 24 * 60 * 60 * 1000
})
const badgeLabel = computed(() => props.badge ?? (isNew.value ? t('catalog.card.new') : null))
</script>

<template>
  <!-- Warm Card (§6.3), а не Paper: §3.3 прямо запрещает чистый белый под карточки
       («сделает сайт холодным и дешёвым»). Карточка светлая даже на Ink Black. -->
  <UiAppCard :to="`/product/${product.slug}`" hover class="group h-full bg-ink-card">
    <div class="app-card-media relative aspect-4/5 overflow-hidden bg-ink-card">
      <NuxtImg
        v-if="primary"
        :src="primary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500"
        :class="secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <NuxtImg
        v-if="secondary"
        :src="secondary"
        :alt="product.title"
        class="absolute inset-0 w-full h-full object-cover opacity-0 scale-105 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-500"
        sizes="(max-width: 768px) 50vw, 320px"
        loading="lazy"
      />
      <div v-if="!primary" class="absolute inset-0 flex items-center justify-center text-ink-gray-400">
        <UIcon name="i-lucide-image" class="size-10" />
      </div>

      <!-- Бейдж «Новинка» / ручная метка -->
      <!-- «small badge» из §3.3 — бордо. Радиус 2px: капсула тут читалась как
           SaaS-тег, а §5.5 задаёт бейджу тот же острый угол, что и кнопке. -->
      <span
        v-if="badgeLabel"
        class="absolute top-3 left-3 z-10 ink-label rounded-xs bg-ink-burgundy/95 text-ink-bone px-2.5 py-1 shadow-sm backdrop-blur-sm"
      >{{ badgeLabel }}</span>

      <!-- Подсказка действия — проявляется по hover (десктоп) -->
      <div
        class="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
      >
        <span class="block w-full text-center rounded-xs bg-ink-burgundy text-ink-bone text-sm font-semibold py-2.5">
          {{ $t('catalog.card.open') }}
        </span>
      </div>
    </div>
    <div class="p-4">
      <div v-if="meta" class="mb-2 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[.12em] text-ink-gray-400">
        <span>{{ meta.fit }} · {{ meta.gsm }}</span>
        <span class="flex items-center -space-x-0.5" aria-hidden="true">
          <i v-for="color in meta.colors" :key="color" class="size-3 rounded-full border border-black/20" :style="{ backgroundColor: color }" />
        </span>
      </div>
      <p class="font-semibold text-ink-text-dark group-hover:text-ink-burgundy transition-colors">{{ product.title }}</p>
      <div class="mt-1 flex items-center justify-between gap-3">
        <p class="text-caption text-ink-text-dark-soft">{{ $t('catalog.card.priceFrom', { price: formatPrice(product.base_price) }) }}</p>
        <UIcon name="i-lucide-arrow-up-right" class="size-4 text-ink-burgundy" />
      </div>
    </div>
  </UiAppCard>
</template>
