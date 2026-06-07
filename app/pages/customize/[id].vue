<script setup lang="ts">
import type { PrintMethod, PrintMode } from '~~/shared/config/print-methods'
import { PRINT_METHOD_LABELS, PRINT_MODE_LABELS } from '~~/shared/config/print-methods'

// Кастомайзер (§7). Порядок шагов: изделие → материал → зона → принт/текст → цвет → цена → корзина.
const route = useRoute()
const alias = route.params.id as string
const { getByAlias } = useCatalog()

const { data: product, error } = await useAsyncData(`customize-${alias}`, () => getByAlias(alias))
if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Изделие не найдено' })
}
useHead({ title: `Конструктор · ${product.value.title} — INKMADE` })

const design = useDesign()
const { material, materialId, placements, selectedId, productColorHex, removePlacement, toSpec } = design
const { breakdown } = usePricing()
const cart = useCart()
const supabase = useSupabaseClient()

// скриншот композиции в Storage (§13.2, артефакт «для глаз»)
async function uploadComposition(blob: Blob): Promise<string> {
  const path = `composition/${Date.now()}-${Math.round(Math.random() * 1e9)}.png`
  const { error } = await supabase.storage.from('design-uploads').upload(path, blob, { contentType: 'image/png' })
  if (error) throw error
  return supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
}

// инициализация состояния на клиенте (canvas + Image — клиент)
onMounted(() => {
  if (product.value) {
    design.init(product.value)
    useAnalytics().viewContent(product.value.id) // первое звено воронки (§3.5.1)
  }
})

const materialItems = computed(() =>
  (product.value?.materials ?? []).map(m => ({ label: m.name, value: m.id })),
)

// размеры в наличии для текущего материала + цвета (§8.2.4 скрываем stock=0)
const sizeVariants = computed(() =>
  (product.value?.variants ?? []).filter(
    v => v.material_id === materialId.value && v.color_hex === productColorHex.value && v.stock > 0,
  ),
)
const selectedSize = ref('')
watch(sizeVariants, (vs) => {
  if (vs.length && !vs.find(v => v.size === selectedSize.value)) selectedSize.value = vs[0]!.size
}, { immediate: true })

const selectedVariant = computed(() =>
  sizeVariants.value.find(v => v.size === selectedSize.value),
)

const toast = useToast()
const submitting = ref(false)
async function onAddToCart() {
  if (submitting.value) return
  if (!placements.value.length) {
    toast.add({ title: 'Добавьте принт или текст', color: 'warning' })
    return
  }
  if (!design.zone.value) {
    toast.add({ title: 'Зона печати не выбрана', color: 'warning' })
    return
  }
  if (!selectedVariant.value) {
    toast.add({ title: 'Выберите размер', color: 'warning' })
    return
  }
  submitting.value = true
  try {
    // скриншот композиции → Storage, ссылка попадёт в spec (§13.2)
    const blob = await design.captureComposition()
    if (blob) {
      try { design.setCompositionUrl(await uploadComposition(blob)) }
      catch { /* скриншот не критичен для печати — оригинал уже в Storage */ }
    }
    const v = selectedVariant.value
    cart.add({
      productId: product.value!.id,
      slug: product.value!.slug,
      alias: product.value!.alias,
      title: product.value!.title,
      variantId: v.id,
      colorName: v.color_name,
      colorHex: v.color_hex,
      size: v.size,
      printMethod: material.value?.print_method ?? null,
      spec: toSpec() as unknown as import('~/types/database.types').Json,
      unitPrice: breakdown.value.unitPrice,
      quantity: 1,
    })
    useAnalytics().addToCart(breakdown.value.unitPrice)
    toast.add({ title: 'Добавлено в корзину', color: 'success' })
    await navigateTo('/cart')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section v-if="product" class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <UiSectionLabel accent>Конструктор</UiSectionLabel>
        <h1 class="ink-display text-h2 mt-1">{{ product.title }}</h1>
      </div>
      <UButton :to="`/product/${product.slug}`" color="neutral" variant="ghost" icon="i-lucide-arrow-left">К товару</UButton>
    </div>

    <div class="grid lg:grid-cols-[auto_1fr] gap-8 items-start">
      <!-- холст -->
      <div class="space-y-3">
        <ClientOnly>
          <CustomizerCanvas />
          <template #fallback>
            <div class="rounded-lg bg-ink-gray-200 animate-pulse" style="width:460px;height:540px" />
          </template>
        </ClientOnly>

        <div v-if="selectedId" class="flex gap-2">
          <UButton color="error" variant="subtle" size="sm" icon="i-lucide-trash-2" @click="removePlacement(selectedId!)">
            Удалить выбранный
          </UButton>
        </div>
        <p class="text-caption text-ink-gray-400">Перетаскивай, меняй размер и поворот в пределах зоны.</p>
      </div>

      <!-- панель управления -->
      <div class="space-y-6 max-w-md">
        <!-- материал (определяет метод/зоны, §5.2.1) -->
        <div v-if="materialItems.length">
          <UiSectionLabel>Материал</UiSectionLabel>
          <USelect v-model="materialId" :items="materialItems" value-key="value" class="w-full mt-2" />
          <p v-if="material" class="text-caption text-ink-gray-600 mt-2">
            {{ PRINT_METHOD_LABELS[material.print_method as PrintMethod] }} ·
            {{ PRINT_MODE_LABELS[material.print_mode as PrintMode] }}
          </p>
        </div>

        <CustomizerZoneSelector />

        <div class="space-y-3 border-t border-ink-gray-200 pt-5">
          <UiSectionLabel accent>Принт</UiSectionLabel>
          <CustomizerDesignUpload />
          <CustomizerPrintLibraryPicker />
        </div>

        <div class="border-t border-ink-gray-200 pt-5">
          <CustomizerTextTool />
        </div>

        <div class="border-t border-ink-gray-200 pt-5">
          <CustomizerProductColorPicker />
        </div>

        <!-- размер (вариант) -->
        <div v-if="sizeVariants.length">
          <UiSectionLabel>Размер</UiSectionLabel>
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="v in sizeVariants"
              :key="v.id"
              class="min-w-11 px-3 py-2 rounded-md border text-center transition-colors"
              :class="v.size === selectedSize ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
              @click="selectedSize = v.size"
            >
              {{ v.size }}
            </button>
          </div>
        </div>

        <CustomizerPriceCalculator @add-to-cart="onAddToCart" />
      </div>
    </div>
  </section>
</template>
