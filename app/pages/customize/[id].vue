<script setup lang="ts">

// Кастомайзер (§7). Порядок шагов: изделие → материал → зона → принт/текст → цвет → цена → корзина.
const route = useRoute()
const alias = route.params.id as string
const { getByAlias } = useCatalog()

const { t } = useI18n()

const { data: product, error } = await useAsyncData(`customize-${alias}`, () => getByAlias(alias))
if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: t('customize.page.notFound') })
}
useHead({ title: t('customize.page.headTitle', { title: product.value.title }) })

const design = useDesign()
const { material, materialId, placements, productColorHex, toSpec, undo, redo, canUndo, canRedo, colorCount, generatePrintFiles } = design
const { breakdown } = usePricing()
const cart = useCart()
const guestDesigns = useGuestDesigns()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

// скриншот композиции в Storage (§13.2, артефакт «для глаз»)
async function uploadComposition(blob: Blob): Promise<string> {
  const path = `composition/${Date.now()}-${Math.round(Math.random() * 1e9)}.png`
  const { error } = await supabase.storage.from('design-uploads').upload(path, blob, { contentType: 'image/png' })
  if (error) throw error
  return supabase.storage.from('design-uploads').getPublicUrl(path).data.publicUrl
}

// «доработать» (§3.1): ?from=<designId> загружает сохранённый дизайн как основу версии
const fromId = computed(() => (route.query.from as string) || null)
const parentId = ref<string | null>(null)

// инициализация состояния на клиенте (canvas + Image — клиент)
onMounted(async () => {
  if (!product.value) return
  design.init(product.value)
  useAnalytics().viewContent(product.value.id) // первое звено воронки (§3.5.1)
  if (fromId.value) {
    try {
      const { data } = await supabase.from('designs').select('spec').eq('id', fromId.value).single()
      if (data?.spec) {
        design.loadSpec(data.spec)
        parentId.value = fromId.value
        toast.add({ title: t('customize.page.loadedForRework'), color: 'success' })
      }
    } catch { /* если дизайн недоступен — начинаем с чистого листа */ }
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

// количество прямо в конструкторе (§9.1) — раньше менялось только в корзине
const quantity = ref(1)
function setQty(n: number) { quantity.value = Math.max(1, Math.min(999, n)) }

// ── 3-зонный редактор: левый тулбар выбирает активный инструмент ──
type ToolKey = 'print' | 'text' | 'shapes'
const activeTool = ref<ToolKey>('print')
const TOOLS: Array<{ key: ToolKey; icon: string }> = [
  { key: 'print', icon: 'i-lucide-image' },
  { key: 'text', icon: 'i-lucide-type' },
  { key: 'shapes', icon: 'i-lucide-shapes' },
]
const lineTotal = computed(() => breakdown.value.unitPrice * Math.max(1, quantity.value))

const toast = useToast()

// сохранить дизайн «на потом» (CRM §3.1/§3.2): вошедшему — сразу в кабинет,
// гостю — локально, перенос в аккаунт при входе (плагин guest-import).
const saving = ref(false)
async function onSaveDesign() {
  if (saving.value) return
  if (!placements.value.length) { toast.add({ title: t('customize.page.addPrintOrText'), color: 'warning' }); return }
  if (!design.zone.value) { toast.add({ title: t('customize.page.zoneNotSelected'), color: 'warning' }); return }
  saving.value = true
  try {
    let previewUrl: string | null = null
    const blob = await design.captureComposition()
    if (blob) {
      try { previewUrl = await uploadComposition(blob); design.setCompositionUrl(previewUrl) }
      catch { /* скриншот не критичен */ }
    }
    // печатные файлы на зону (300 DPI, прозрачный фон) — артефакт «для печати»
    try { await generatePrintFiles() } catch { /* не блокируем сохранение */ }
    const spec = toSpec() as unknown as import('~/types/database.types').Json
    if (user.value) {
      await $fetch('/api/designs/import', {
        method: 'POST',
        body: { designs: [{ productId: product.value!.id, spec, previewUrl, parentId: parentId.value }] },
      })
      toast.add({ title: t('customize.page.savedToCabinet'), color: 'success' })
      await navigateTo('/account/designs')
    } else {
      guestDesigns.add({
        productId: product.value!.id, alias: product.value!.alias, title: product.value!.title, spec, previewUrl,
      })
      toast.add({ title: t('customize.page.saved'), description: t('customize.page.savedGuestHint'), color: 'success' })
    }
  } catch (e) {
    toast.add({ title: t('customize.page.saveFailed'), description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const notify = useNotify()
const { fly } = useFlyToCart()
const canvasWrap = ref<HTMLElement | null>(null)

const submitting = ref(false)
async function onAddToCart() {
  if (submitting.value) return
  if (!placements.value.length) {
    notify.warn(t('customize.page.addPrintOrText'))
    return
  }
  if (!design.zone.value) {
    notify.warn(t('customize.page.zoneNotSelected'))
    return
  }
  if (!selectedVariant.value) {
    notify.warn(t('customize.page.selectSize'))
    return
  }
  submitting.value = true
  let previewObjUrl: string | undefined
  try {
    // скриншот композиции → Storage, ссылка попадёт в spec (§13.2)
    const blob = await design.captureComposition()
    if (blob) {
      previewObjUrl = URL.createObjectURL(blob)
      try { design.setCompositionUrl(await uploadComposition(blob)) }
      catch { /* скриншот не критичен для печати — оригинал уже в Storage */ }
    }
    // печатные файлы на зону (300 DPI, прозрачный фон) — закрывает проблему шрифтов в цеху
    try { await generatePrintFiles() } catch { /* не блокируем заказ */ }
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
      quantity: quantity.value,
    })
    useAnalytics().addToCart(breakdown.value.unitPrice * quantity.value)
    // «улёт в корзину» + toast (§6.3, §7.2). Остаёмся в конструкторе — собрать ещё или оформить.
    fly(canvasWrap.value, previewObjUrl)
    notify.addedToCart()
  } finally {
    submitting.value = false
    // освобождаем object URL гарантированно (после анимации улёта), даже при ошибке
    if (previewObjUrl) { const u = previewObjUrl; setTimeout(() => URL.revokeObjectURL(u), 1200) }
  }
}
</script>

<template>
  <section v-if="product" class="pb-24 lg:pb-0">
    <!-- верхняя панель: назад · заголовок · undo/redo/save -->
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <UButton :to="`/product/${product.slug}`" color="neutral" variant="ghost" icon="i-lucide-arrow-left" :aria-label="$t('customize.page.toProduct')" />
        <div class="min-w-0">
          <UiSectionLabel accent>{{ $t('customize.page.label') }}</UiSectionLabel>
          <h1 class="ink-display text-h3 truncate">{{ product.title }}</h1>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-undo-2" :disabled="!canUndo" :title="$t('customize.page.undo')" @click="undo()" />
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-redo-2" :disabled="!canRedo" :title="$t('customize.page.redo')" @click="redo()" />
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-bookmark" :loading="saving" :title="$t('customize.page.saveDesign')" @click="onSaveDesign">
          <span class="hidden sm:inline">{{ $t('customize.page.saveDesign') }}</span>
        </UButton>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row lg:items-start gap-4">
      <!-- ЛЕВО: тулбар (десктоп — вертикальный, мобайл — горизонтальный) -->
      <nav class="order-2 lg:order-1 flex lg:flex-col gap-1.5 lg:gap-2 overflow-x-auto lg:overflow-visible shrink-0">
        <button
          v-for="tl in TOOLS" :key="tl.key"
          class="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 lg:w-16 lg:h-16 text-caption transition-colors shrink-0"
          :class="activeTool === tl.key ? 'bg-ink-burgundy text-ink-white' : 'bg-ink-gray-50 text-ink-gray-600 hover:bg-ink-gray-100'"
          :aria-pressed="activeTool === tl.key"
          @click="activeTool = tl.key"
        >
          <UIcon :name="tl.icon" class="size-5" />
          {{ $t(`customize.tools.${tl.key}`) }}
        </button>
      </nav>

      <!-- ЛЕВО-2: панель активного инструмента -->
      <div class="order-3 lg:order-2 lg:w-72 shrink-0 lg:sticky lg:top-4">
        <div class="rounded-xl border border-ink-gray-200 bg-ink-white p-4 space-y-3">
          <template v-if="activeTool === 'print'">
            <UiSectionLabel accent>{{ $t('customize.page.print') }}</UiSectionLabel>
            <CustomizerDesignUpload />
            <CustomizerPrintLibraryPicker />
          </template>
          <CustomizerTextTool v-else-if="activeTool === 'text'" />
          <CustomizerShapePicker v-else-if="activeTool === 'shapes'" />
        </div>
      </div>

      <!-- ЦЕНТР: зоны + холст (фокус) -->
      <div class="order-1 lg:order-3 flex-1 min-w-0 lg:sticky lg:top-4">
        <div class="rounded-xl border border-ink-gray-200 bg-ink-gray-50 p-3 sm:p-4 flex flex-col items-center gap-3">
          <CustomizerZoneSelector class="self-stretch" />
          <div ref="canvasWrap" class="w-full flex justify-center">
            <ClientOnly>
              <CustomizerCanvas />
              <template #fallback>
                <div class="rounded-lg bg-ink-gray-200 animate-pulse" style="width:460px;height:540px;max-width:100%" />
              </template>
            </ClientOnly>
          </div>
          <p class="text-caption text-ink-gray-400 text-center">{{ $t('customize.page.canvasHint') }}</p>
        </div>
      </div>

      <!-- ПРАВО: настройка товара · слои · итог -->
      <div class="order-4 lg:w-80 shrink-0 space-y-4">
        <div class="rounded-xl border border-ink-gray-200 bg-ink-white p-4 space-y-4">
          <UiSectionLabel>{{ $t('customize.page.setup') }}</UiSectionLabel>
          <div v-if="materialItems.length">
            <span class="text-caption text-ink-gray-600">{{ $t('customize.page.material') }}</span>
            <USelect v-model="materialId" :items="materialItems" value-key="value" class="w-full mt-1" />
            <p v-if="material" class="text-caption text-ink-gray-500 mt-1.5">
              {{ $t(`domain.printMethod.${material.print_method}`) }} · {{ $t(`domain.printMode.${material.print_mode}`) }}
            </p>
            <div v-if="material?.print_method === 'silkscreen'" class="mt-3">
              <span class="text-caption text-ink-gray-600">{{ $t('customize.page.colorCount') }}</span>
              <div class="flex items-center gap-2 mt-1">
                <UButton color="neutral" variant="subtle" size="xs" icon="i-lucide-minus" :disabled="colorCount <= 1" @click="colorCount = Math.max(1, colorCount - 1)" />
                <span class="min-w-8 text-center font-semibold tabular-nums">{{ colorCount }}</span>
                <UButton color="neutral" variant="subtle" size="xs" icon="i-lucide-plus" :disabled="colorCount >= 8" @click="colorCount = Math.min(8, colorCount + 1)" />
              </div>
            </div>
          </div>
          <CustomizerProductColorPicker />
          <div v-if="sizeVariants.length">
            <span class="text-caption text-ink-gray-600">{{ $t('customize.page.size') }}</span>
            <div class="flex flex-wrap gap-2 mt-1">
              <button
                v-for="v in sizeVariants" :key="v.id"
                class="min-w-11 px-3 py-2 rounded-md border text-center transition-colors"
                :class="v.size === selectedSize ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
                @click="selectedSize = v.size"
              >{{ v.size }}</button>
            </div>
          </div>
          <div>
            <span class="text-caption text-ink-gray-600">{{ $t('customize.page.quantity') }}</span>
            <div class="flex items-center gap-2 mt-1">
              <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-minus" :disabled="quantity <= 1" @click="setQty(quantity - 1)" />
              <span class="min-w-12 text-center text-h4 font-semibold tabular-nums">{{ quantity }}</span>
              <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-plus" @click="setQty(quantity + 1)" />
            </div>
          </div>
        </div>

        <!-- слои + инспектор выбранного -->
        <div class="rounded-xl border border-ink-gray-200 bg-ink-white p-4">
          <CustomizerLayerPanel />
          <p v-if="!placements.length" class="text-caption text-ink-gray-400">{{ $t('customize.page.addPrintOrText') }}</p>
        </div>

        <!-- итог (липкий на десктопе) -->
        <div class="hidden lg:block lg:sticky lg:bottom-4">
          <CustomizerPriceCalculator :quantity="quantity" @add-to-cart="onAddToCart" />
        </div>
      </div>
    </div>

    <!-- мобайл: липкий нижний бар цена + CTA -->
    <div class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-white/95 backdrop-blur border-t border-ink-gray-200 px-4 py-3 flex items-center gap-3">
      <div class="min-w-0">
        <div class="text-caption text-ink-gray-500 leading-none">{{ $t('customize.price.total') }}</div>
        <div class="text-h4 font-bold text-ink-burgundy tabular-nums">{{ formatPrice(lineTotal) }}</div>
      </div>
      <UiAppButton class="flex-1" block variant="primary" icon="i-lucide-shopping-cart" :loading="submitting" @click="onAddToCart">{{ $t('customize.price.addToCart') }}</UiAppButton>
    </div>
  </section>
</template>
