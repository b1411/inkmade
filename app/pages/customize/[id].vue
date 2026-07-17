<script setup lang="ts">
import { FEATURES } from '~~/shared/config/features'
import { preflightDesign } from '~~/shared/design/spec'

definePageMeta({ layout: 'customizer' })

// Кастомайзер (§7). Порядок шагов: изделие → материал → зона → принт/текст → цвет → цена → корзина.
const route = useRoute()
const alias = route.params.id as string
const { getByAlias, listAll } = useCatalog()

const { t } = useI18n()

const { data: product, error } = await useAsyncData(`customize-${alias}`, () => getByAlias(alias))
if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: t('customize.page.notFound') })
}
useHead({ title: t('customize.page.headTitle', { title: product.value.title }) })
const { data: switchProducts } = await useAsyncData('customizer-switch-products', () => listAll())

async function switchProduct(nextAlias: string) {
  if (!nextAlias || nextAlias === alias || !import.meta.client) return
  sessionStorage.setItem('inkmade:product-switch-spec', JSON.stringify(toSpec()))
  await navigateTo(`/customize/${nextAlias}?switch=1`)
}

const design = useDesign()
const { material, materialId, placements, productColorHex, toSpec, undo, redo, canUndo, canRedo, generatePrintFiles } = design
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
const customizerReady = ref(false)
// доработка позиции корзины (§9.1): ?cart=<itemId> — восстанавливаем spec и параметры,
// при повторном «в корзину» обновляем ЭТУ позицию, а не создаём дубль.
const editCartId = computed(() => (route.query.cart as string) || null)
const autosave = useDesignAutosave({
  productId: product.value.id,
  draftKey: `${alias}:${editCartId.value ?? fromId.value ?? 'new'}`.slice(0, 128),
  toSpec,
  loadSpec: design.loadSpec,
})

// инициализация состояния на клиенте (canvas + Image — клиент)
onMounted(async () => {
  customizerReady.value = true
  if (!product.value) return
  // из карточки товара приходят выбранные материал/цвет/размер (?material&color&size) —
  // прокидываем их в init, чтобы не сбрасывать выбор пользователя в дефолт
  // (раньше «Чёрный / XL» терялся при переходе в конструктор).
  design.init(product.value, {
    materialId: (route.query.material as string) || undefined,
    colorHex: (route.query.color as string) || undefined,
  })
  useAnalytics().customizeStart(product.value.id, mode.value)
  let restoredFromSwitch = false
  if (route.query.switch === '1') {
    const raw = sessionStorage.getItem('inkmade:product-switch-spec')
    sessionStorage.removeItem('inkmade:product-switch-spec')
    if (raw) {
      try {
        design.loadSpec(JSON.parse(raw), { compatibleOnly: true })
        restoredFromSwitch = true
        toast.add({ title: t('customize.page.productSwitched'), color: 'success' })
      } catch { /* повреждённый session draft не блокирует редактор */ }
    }
  }
  if (restoredFromSwitch) {
    // compatible placements already restored above
  } else if (editCartId.value) {
    // доработка позиции корзины: spec лежит локально, не в БД
    cart.load()
    const item = cart.items.value.find(i => i.id === editCartId.value)
    if (item?.spec) {
      design.loadSpec(item.spec)
      await nextTick() // дать пересчитаться sizeVariants под восстановленные цвет/материал
      // размер и количество — поля позиции, их нет в spec (размер — только если ещё в наличии)
      if (item.size && sizeVariants.value.some(v => v.size === item.size)) selectedSize.value = item.size
      quantity.value = item.quantity || 1
      toast.add({ title: t('customize.page.loadedForRework'), color: 'success' })
    }
  } else if (fromId.value) {
    try {
      const { data } = await supabase.from('designs').select('spec').eq('id', fromId.value).single()
      if (data?.spec) {
        design.loadSpec(data.spec)
        parentId.value = fromId.value
        toast.add({ title: t('customize.page.loadedForRework'), color: 'success' })
      }
    } catch { /* если дизайн недоступен — начинаем с чистого листа */ }
  } else if (route.query.size) {
    // свежий вход из карточки товара: восстановить выбранный размер
    await nextTick() // дать sizeVariants пересчитаться под переданные материал/цвет
    const sz = route.query.size as string
    if (sizeVariants.value.some(v => v.size === sz)) selectedSize.value = sz
  }
  if (!editCartId.value && !fromId.value && !restoredFromSwitch) {
    const restored = await autosave.restore()
    if (restored) toast.add({ title: t('customize.autosave.restored'), color: 'info' })
  }
  autosave.start()
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
// мобильный доступ к параметрам изделия (bottom-sheet)
const paramsOpen = ref(false)

// ── 3-зонный редактор: левый тулбар выбирает активный инструмент ──
type ToolKey = 'print' | 'template' | 'text' | 'shape' | 'ai'
const activeTool = ref<ToolKey>('print')
const TOOLS: Array<{ key: ToolKey; icon: string }> = [
  { key: 'print', icon: 'i-lucide-image' },
  { key: 'template', icon: 'i-lucide-layout-template' },
  { key: 'text', icon: 'i-lucide-type' },
  { key: 'shape', icon: 'i-lucide-shapes' },
  // вкладка AI-генерации — только при включённом флаге aiDesign
  ...(FEATURES.aiDesign ? [{ key: 'ai' as const, icon: 'i-lucide-sparkles' }] : []),
]
const mode = ref<'simple' | 'advanced'>('simple')
const modes = ['simple', 'advanced'] as const
const visibleTools = computed(() => mode.value === 'simple'
  ? TOOLS.filter(tool => tool.key === 'print' || tool.key === 'template' || tool.key === 'text')
  : TOOLS)
watch(mode, (value) => {
  if (value === 'simple' && !visibleTools.value.some(tool => tool.key === activeTool.value)) activeTool.value = 'print'
  if (value === 'advanced') useAnalytics().track('simple_to_advanced', { product_id: product.value?.id })
})
watch(() => placements.value.length, (count, previous) => {
  if (count > previous) {
    const placement = placements.value.at(-1)
    useAnalytics().assetAdded(placement?.kind || 'unknown', placement?.zone)
  }
})
const lineTotal = computed(() => breakdown.value.unitPrice * Math.max(1, quantity.value))
const preflight = computed(() => preflightDesign(toSpec(), {
  zones: (product.value?.print_zones ?? []).map(zone => ({
    name: zone.name,
    width_mm: Number(zone.max_width_mm) || 1,
    height_mm: Number(zone.max_height_mm) || 1,
  })),
  supported_print_modes: material.value?.print_mode ? [material.value.print_mode] : undefined,
}))
const preflightOpen = ref(false)
const proofOpen = ref(false)
const proofLoading = ref(false)
const proofPreviews = ref<Array<{ zone: string; title: string; url: string }>>([])
const warningConfirmed = ref(false)
watch(() => JSON.stringify(toSpec()), () => { warningConfirmed.value = false })

function clearProofPreviews() {
  for (const preview of proofPreviews.value) URL.revokeObjectURL(preview.url)
  proofPreviews.value = []
}

async function openProof() {
  if (!placements.value.length || proofLoading.value) return
  proofOpen.value = true
  proofLoading.value = true
  clearProofPreviews()
  const previousZone = design.zoneName.value
  design.selectPlacement(null)
  try {
    const occupied = design.validZones.value.filter(zone => design.zonesWithPlacements.value.has(zone.name))
    for (const zone of occupied) {
      design.zoneName.value = zone.name
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 80))
      const blob = await design.captureComposition()
      if (blob) proofPreviews.value.push({ zone: zone.name, title: zone.title, url: URL.createObjectURL(blob) })
    }
  } finally {
    design.zoneName.value = previousZone
    proofLoading.value = false
  }
}

onBeforeUnmount(clearProofPreviews)

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
    // снимаем выделение, иначе в скриншот попадут маркеры трансформера
    design.selectedId.value = null
    await nextTick()
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
    toast.add({ title: t('customize.page.saveFailed'), description: getFetchMessage(e), color: 'error' })
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
  if (!preflight.value.can_continue) {
    preflightOpen.value = true
    notify.error(t('customize.preflight.blocked'))
    return
  }
  if (preflight.value.summary.warnings > 0 && !warningConfirmed.value) {
    preflightOpen.value = true
    return
  }
  useAnalytics().preflightPass(preflight.value.summary.warnings)
  submitting.value = true
  let previewObjUrl: string | undefined
  try {
    // снимаем выделение, иначе в скриншот попадут маркеры трансформера
    design.selectedId.value = null
    await nextTick()
    // скриншот композиции → Storage, ссылка попадёт в spec (§13.2)
    const blob = await design.captureComposition()
    if (blob) {
      previewObjUrl = URL.createObjectURL(blob)
      try { design.setCompositionUrl(await uploadComposition(blob)) }
      catch { /* скриншот не критичен для печати — оригинал уже в Storage */ }
    }
    // печатные файлы на зону (300 DPI, прозрачный фон) — артефакт «для печати».
    // Если для НЕПУСТОГО дизайна не удалось получить ни одного файла — НЕ пускаем
    // позицию в заказ: иначе она уйдёт в цех без печатного артефакта, а брак
    // вскроется уже после продажи. (Пустой дизайн сюда не доходит — guard выше.)
    let files: import('~/composables/useDesign').PrintFile[] = []
    try { files = await generatePrintFiles() } catch {
      files = []
      useAnalytics().track('print_export_error', { product_id: product.value?.id })
    }
    if (!files.length) {
      notify.error(t('customize.page.printFilesFailed'))
      return
    }
    const v = selectedVariant.value
    const item = {
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
    }
    // доработка существующей позиции: обновляем её и возвращаемся в корзину
    if (editCartId.value && cart.items.value.some(i => i.id === editCartId.value)) {
      cart.update(editCartId.value, item)
      notify.addedToCart()
      await navigateTo('/cart')
      return
    }
    cart.add(item)
    useAnalytics().addToCart(breakdown.value.unitPrice * quantity.value)
    // «улёт в корзину» + toast (§6.3, §7.2). Остаёмся в конструкторе — собрать ещё или оформить.
    fly(canvasWrap.value as HTMLElement | null, previewObjUrl)
    notify.addedToCart()
  } catch (e) {
    // раньше блок был try/finally без catch: любой сбой ДО cart.add (скриншот,
    // выгрузка, квота localStorage) рвал поток молча — корзина «не наполнялась»
    // без единого сигнала. Теперь сбой виден пользователю.
    notify.error(t('customize.page.addToCartFailed'), getFetchMessage(e))
  } finally {
    submitting.value = false
    // освобождаем object URL гарантированно (после анимации улёта), даже при ошибке
    if (previewObjUrl) { const u = previewObjUrl; setTimeout(() => URL.revokeObjectURL(u), 1200) }
  }
}
</script>

<template>
  <section v-if="product" class="customizer-dark pb-24 lg:pb-0" :data-ready="customizerReady">
    <!-- верхняя панель: назад · заголовок · undo/redo/save -->
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <UButton :to="`/product/${product.slug}`" color="neutral" variant="ghost" icon="i-lucide-arrow-left" :aria-label="$t('customize.page.toProduct')" />
        <div class="min-w-0">
          <UiSectionLabel accent>{{ $t('customize.page.label') }}</UiSectionLabel>
          <h1 class="ink-display text-h3 truncate">{{ product.title }}</h1>
          <USelect
            :model-value="alias"
            :items="(switchProducts ?? []).map(item => ({ label: item.title, value: item.alias }))"
            size="xs"
            class="mt-1 hidden min-w-48 sm:flex"
            :aria-label="$t('customize.page.switchProduct')"
            @update:model-value="value => switchProduct(String(value))"
          />
          <p class="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.1em] text-white/45" aria-live="polite">
            <span class="size-1.5 rounded-full" :class="autosave.status.value === 'saved' ? 'bg-ink-success' : autosave.status.value === 'error' || autosave.status.value === 'conflict' ? 'bg-ink-error' : 'bg-ink-warning'" />
            {{ $t(`customize.autosave.${autosave.status.value}`) }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <div class="mr-1 hidden border border-white/15 bg-ink-panel p-1 sm:flex">
          <button
            v-for="value in modes"
            :key="value"
            type="button"
            class="min-h-8 px-3 font-mono text-[10px] uppercase tracking-[.12em] transition-colors"
            :class="mode === value ? 'bg-ink-burgundy text-white' : 'text-white/45 hover:text-white'"
            :aria-pressed="mode === value"
            @click="mode = value"
          >
            {{ value }}
          </button>
        </div>
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-undo-2" :disabled="!canUndo" :title="$t('customize.page.undo')" @click="undo()" />
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-redo-2" :disabled="!canRedo" :title="$t('customize.page.redo')" @click="redo()" />
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-bookmark" :loading="saving" :title="$t('customize.page.saveDesign')" @click="onSaveDesign">
          <span class="hidden sm:inline">{{ $t('customize.page.saveDesign') }}</span>
        </UButton>
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-scan-eye" :disabled="!placements.length" :title="$t('customize.proof.open')" @click="openProof">
          <span class="hidden xl:inline">{{ $t('customize.proof.open') }}</span>
        </UButton>
      </div>
    </div>

    <CustomizerOnboarding />

    <div class="flex flex-col lg:flex-row lg:items-start gap-4">
      <!-- ЛЕВО: тулбар (десктоп — вертикальный, мобайл — горизонтальный) -->
      <nav class="order-2 lg:order-1 flex lg:flex-col gap-1.5 lg:gap-2 overflow-x-auto lg:overflow-visible shrink-0">
        <button
          v-for="tl in visibleTools" :key="tl.key"
          class="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 lg:w-16 lg:h-16 text-caption transition-colors shrink-0"
          :class="activeTool === tl.key ? 'bg-ink-burgundy text-ink-white' : 'bg-ink-panel text-ink-text-soft hover:bg-ink-panel-hover'"
          :aria-pressed="activeTool === tl.key"
          @click="activeTool = tl.key"
        >
          <UIcon :name="tl.icon" class="size-5" />
          {{ $t(`customize.tools.${tl.key}`) }}
        </button>
      </nav>

      <!-- ЛЕВО-2: панель активного инструмента -->
      <div class="order-3 lg:order-2 lg:w-72 shrink-0 lg:sticky lg:top-4">
        <div class="rounded-sm border border-white/10 bg-ink-panel p-4 space-y-3">
          <template v-if="activeTool === 'print'">
            <UiSectionLabel accent>{{ $t('customize.page.print') }}</UiSectionLabel>
            <CustomizerDesignUpload />
            <CustomizerPrintLibraryPicker />
          </template>
          <CustomizerTemplateBrowser v-else-if="activeTool === 'template'" />
          <CustomizerTextTool v-else-if="activeTool === 'text'" />
          <CustomizerShapePicker v-else-if="activeTool === 'shape'" />
          <CustomizerAIGenerator v-else-if="activeTool === 'ai'" />
        </div>
      </div>

      <!-- ЦЕНТР: зоны + холст (фокус) -->
      <div class="order-1 lg:order-3 flex-1 min-w-0 lg:sticky lg:top-4">
        <div class="rounded-sm border border-white/10 bg-ink-panel p-3 sm:p-4 flex flex-col items-center gap-3">
          <div class="flex w-full items-center justify-between gap-3 sm:hidden">
            <p class="font-mono text-[10px] uppercase tracking-[.12em] text-white/45">MODE / {{ mode }}</p>
            <button type="button" class="border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.1em]" @click="mode = mode === 'simple' ? 'advanced' : 'simple'">
              {{ mode === 'simple' ? 'Advanced' : 'Simple' }}
            </button>
          </div>
          <CustomizerZoneSelector :advanced="mode === 'advanced'" class="self-stretch" />
          <div ref="canvasWrap" class="w-full flex justify-center">
            <ClientOnly>
              <CustomizerCanvas />
              <template #fallback>
                <div class="rounded-lg bg-ink-gray-200 animate-pulse" style="width:460px;height:540px;max-width:100%" />
              </template>
            </ClientOnly>
          </div>
          <!-- приглашающее пустое состояние / подсказка по работе -->
          <div v-if="!placements.length" class="text-center">
            <div class="mx-auto grid size-12 place-items-center rounded-full bg-ink-burgundy/10 text-ink-burgundy customizer-pulse">
              <UIcon name="i-lucide-image-plus" class="size-6" />
            </div>
            <p class="ink-display text-h3 mt-2">{{ $t('customize.page.emptyCanvasTitle') }}</p>
            <p class="text-caption text-ink-gray-600 mt-1 max-w-xs mx-auto">{{ $t('customize.page.emptyCanvasText') }}</p>
          </div>
          <p v-else class="text-caption text-ink-gray-600 text-center">{{ $t('customize.page.canvasHint') }}</p>
        </div>
      </div>

      <!-- ПРАВО: настройка товара · слои · итог -->
      <div class="order-4 lg:w-80 shrink-0 space-y-4">
        <div class="rounded-sm border border-white/10 bg-ink-panel p-4">
          <CustomizerSetupPanel
            v-model:size="selectedSize"
            v-model:quantity="quantity"
            :material-items="materialItems"
            :size-variants="sizeVariants"
          />
        </div>

        <!-- слои + инспектор выбранного -->
        <div v-if="mode === 'advanced'" class="rounded-sm border border-white/10 bg-ink-panel p-4">
          <CustomizerLayerPanel />
          <p v-if="!placements.length" class="text-caption text-ink-gray-600">{{ $t('customize.page.addPrintOrText') }}</p>
        </div>

        <!-- итог (липкий на десктопе) -->
        <div class="hidden lg:block lg:sticky lg:bottom-4">
          <CustomizerPriceCalculator :quantity="quantity" @add-to-cart="onAddToCart" />
        </div>
      </div>
    </div>

    <!-- мобайл: липкий нижний бар цена + параметры + CTA -->
    <div class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-panel/95 text-white backdrop-blur border-t border-white/10 px-4 py-3 flex items-center gap-3">
      <div class="min-w-0">
        <div class="text-caption text-ink-gray-500 leading-none">{{ $t('customize.price.total') }}</div>
        <div class="text-h4 font-bold text-ink-burgundy tabular-nums">{{ formatPrice(lineTotal) }}</div>
      </div>
      <UButton color="neutral" variant="outline" size="lg" icon="i-lucide-sliders-horizontal" :aria-label="$t('customize.page.openParams')" @click="paramsOpen = true" />
      <UiAppButton class="flex-1" block variant="primary" icon="i-lucide-shopping-cart" :loading="submitting" @click="onAddToCart">{{ $t('customize.price.addToCart') }}</UiAppButton>
    </div>

    <!-- мобайл: bottom-sheet параметров изделия (состояние общее с правой панелью) -->
    <USlideover v-model:open="paramsOpen" side="bottom" :title="$t('customize.page.paramsTitle')">
      <template #body>
        <CustomizerSetupPanel
          v-model:size="selectedSize"
          v-model:quantity="quantity"
          :material-items="materialItems"
          :size-variants="sizeVariants"
        />
      </template>
    </USlideover>

    <UModal :open="autosave.status.value === 'conflict'" :title="$t('customize.autosave.conflictTitle')" :dismissible="false">
      <template #body>
        <p class="text-sm text-ink-gray-600">{{ $t('customize.autosave.conflictText') }}</p>
        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <UButton color="neutral" variant="outline" block @click="autosave.keepCurrent">{{ $t('customize.autosave.keepCurrent') }}</UButton>
          <UButton color="primary" block @click="autosave.useLatestSaved">{{ $t('customize.autosave.useSaved') }}</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="preflightOpen" :title="$t('customize.preflight.title')">
      <template #body>
        <CustomizerPreflightPanel :result="preflight" />
        <div class="mt-5 flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="preflightOpen = false">{{ $t('customize.preflight.back') }}</UButton>
          <UButton
            v-if="preflight.can_continue && preflight.summary.warnings > 0"
            color="primary"
            @click="warningConfirmed = true; preflightOpen = false; onAddToCart()"
          >
            {{ $t('customize.preflight.continue') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="proofOpen" :title="$t('customize.proof.title')" :ui="{ content: 'sm:max-w-5xl' }">
      <template #body>
        <p class="mb-4 text-sm text-ink-gray-600">{{ $t('customize.proof.description') }}</p>
        <div v-if="proofLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          <UiSkeleton v-for="n in Math.max(1, design.zonesWithPlacements.value.size)" :key="n" class="aspect-[4/5]" />
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <figure v-for="preview in proofPreviews" :key="preview.zone" class="overflow-hidden border border-ink-gray-200 bg-ink-gray-50">
            <img :src="preview.url" :alt="preview.title" class="aspect-[4/5] w-full object-contain">
            <figcaption class="border-t border-ink-gray-200 px-3 py-2 text-xs font-semibold">{{ preview.title }}</figcaption>
          </figure>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
/* Пульс приглашающего пустого состояния холста — бордо-кольцо (гасится reduced-motion). */
.customizer-pulse {
  animation: customizer-pulse 2.4s var(--ease-out) infinite;
}

.customizer-dark {
  --ui-bg: var(--color-ink-panel);
  --ui-bg-muted: var(--color-ink-panel-hover);
  --ui-bg-elevated: var(--color-ink-panel-hover);
  --ui-bg-accented: #303238;
  --ui-text: var(--color-ink-text);
  --ui-text-muted: var(--color-ink-text-soft);
  --ui-text-toned: var(--color-ink-text-muted);
  --ui-text-highlighted: #fff;
  --ui-border: rgba(255, 255, 255, .14);
  --ui-border-muted: rgba(255, 255, 255, .1);
  --ui-border-accented: rgba(255, 255, 255, .24);
  color-scheme: dark;
}
.customizer-dark :deep(.bg-ink-white) { background-color: var(--color-ink-panel); }
.customizer-dark :deep(.bg-ink-gray-50) { background-color: var(--color-ink-panel); }
.customizer-dark :deep(.bg-ink-gray-100),
.customizer-dark :deep(.bg-ink-gray-200) { background-color: var(--color-ink-panel-hover); }
.customizer-dark :deep(.border-ink-gray-200) { border-color: rgba(255, 255, 255, .12); }
.customizer-dark :deep(.text-ink-gray-600) { color: var(--color-ink-text-soft); }
.customizer-dark :deep(.text-ink-gray-500),
.customizer-dark :deep(.text-ink-gray-400) { color: var(--color-ink-text-muted); }
@keyframes customizer-pulse {
  0% { box-shadow: 0 0 0 0 rgba(122, 31, 40, 0.35); }
  70% { box-shadow: 0 0 0 12px rgba(122, 31, 40, 0); }
  100% { box-shadow: 0 0 0 0 rgba(122, 31, 40, 0); }
}
</style>
