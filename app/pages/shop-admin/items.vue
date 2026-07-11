<script setup lang="ts">
// Витрина магазина (Фаза B3): владелец публикует свои сохранённые дизайны как позиции.
// Позиция = снапшот (title/preview/price) + ссылка на design (композицию) для buy-flow.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.items.headTitle') })

const { getMine, listItems, saveItem, deleteItem, myDesigns } = useMyShop()
const toast = useToast()

const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: items, refresh } = await useAsyncData('my-shop-items', async () => (shop.value ? listItems(shop.value.id) : []))
const { data: designs } = await useAsyncData('my-designs', () => myDesigns())

const { money: fmtPrice } = useFormat()

const blank = () => ({ id: '', designId: '', title: '', description: '', price: 0, markup: 0, sort: 0, isActive: true, previewUrl: '' as string | null })
const form = reactive(blank())
const saving = ref(false)
const editing = computed(() => !!form.id)

// наценка v2: покупатель платит price+markup; владелец получает 100% наценки
// + revenue_share_pct% от базы (price). Живой расчёт для формы.
const rate = computed(() => Number(shop.value?.revenue_share_pct) || 0)
const buyerPays = computed(() => (Number(form.price) || 0) + (Number(form.markup) || 0))
const ownerGets = computed(() => (Number(form.markup) || 0) + Math.round((Number(form.price) || 0) * rate.value / 100))

// при выборе дизайна — подставить превью/название
watch(() => form.designId, (id) => {
  if (!id) return
  const d = (designs.value ?? []).find(x => x.id === id)
  if (d) {
    form.previewUrl = d.preview_url
    if (!form.title) form.title = d.title || t('shopAdmin.items.defaultTitle')
  }
})

function startEdit(it: NonNullable<typeof items.value>[number]) {
  Object.assign(form, {
    id: it.id, designId: it.design_id ?? '', title: it.title, description: it.description ?? '',
    price: Number(it.price), markup: Number(it.markup), sort: it.sort, isActive: it.is_active, previewUrl: it.preview_url,
  })
}
function reset() { Object.assign(form, blank()) }

async function onSave() {
  if (!shop.value) return
  if (!form.title.trim()) { toast.add({ title: t('shopAdmin.items.titleRequired'), color: 'warning' }); return }
  // активная позиция обязана иметь цену > 0 (price+markup; иначе витрина покажет её, но заказ упрётся в 400)
  if (form.isActive && !(buyerPays.value > 0)) { toast.add({ title: t('shopAdmin.items.priceRequired'), color: 'warning' }); return }
  saving.value = true
  try {
    const d = (designs.value ?? []).find(x => x.id === form.designId)
    await saveItem({
      id: form.id || undefined,
      shop_id: shop.value.id,
      design_id: form.designId || null,
      product_id: d?.product_id ?? null,
      variant_id: d?.variant_id ?? null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      preview_url: form.previewUrl,
      price: Number(form.price) || 0,
      markup: Number(form.markup) || 0,
      sort: Number(form.sort) || 0,
      is_active: form.isActive,
    })
    toast.add({ title: editing.value ? t('shopAdmin.items.updated') : t('shopAdmin.items.added'), color: 'success' })
    reset()
    await refresh()
  } catch (e) {
    toast.add({ title: t('shopAdmin.items.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(it: NonNullable<typeof items.value>[number]) {
  try {
    await saveItem({ id: it.id, shop_id: it.shop_id, title: it.title, is_active: !it.is_active })
    await refresh()
    toast.add({ title: t('states.saved'), color: 'success' })
  } catch (e) { toast.add({ title: t('shopAdmin.items.error'), description: getFetchMessage(e), color: 'error' }) }
}

const { confirm } = useConfirm()
async function onDelete(it: NonNullable<typeof items.value>[number]) {
  const ok = await confirm({ title: t('shopAdmin.items.deleteConfirm', { title: it.title }), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  try { await deleteItem(it.id); toast.add({ title: t('shopAdmin.items.deleted'), color: 'success' }); await refresh() }
  catch (e) { toast.add({ title: t('shopAdmin.items.error'), description: getFetchMessage(e), color: 'error' }) }
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.items.label')" :title="$t('shopAdmin.items.title')" :description="$t('shopAdmin.items.description')" />

    <div class="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      <!-- список позиций -->
      <div>
        <UiEmptyState
          v-if="!items?.length"
          icon="i-lucide-shopping-bag"
          :title="$t('shopAdmin.items.emptyTitle')"
          :description="$t('shopAdmin.items.emptyText')"
        />
        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="it in items" :key="it.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
            <div class="aspect-[3/4] bg-ink-cream/40">
              <img v-if="it.preview_url" :src="it.preview_url" :alt="it.title" class="w-full h-full object-contain">
              <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-300"><UIcon name="i-lucide-shirt" class="size-8" /></div>
            </div>
            <div class="p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-semibold truncate">{{ it.title }}</p>
                <UBadge :color="it.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ it.is_active ? $t('shopAdmin.items.active') : $t('shopAdmin.items.hidden') }}
                </UBadge>
              </div>
              <p class="font-bold text-ink-burgundy">{{ fmtPrice(Number(it.price) + Number(it.markup)) }}</p>
              <div class="flex items-center gap-1 pt-1">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(it)" />
                <UButton size="xs" color="neutral" variant="ghost" :icon="it.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye'" @click="toggleActive(it)" />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(it)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- форма добавления/редактирования -->
      <UiPanel :title="editing ? $t('shopAdmin.items.formEdit') : $t('shopAdmin.items.formAdd')" class="h-fit">
        <template v-if="editing" #actions>
          <UButton size="xs" color="neutral" variant="ghost" @click="reset">{{ $t('shopAdmin.items.newButton') }}</UButton>
        </template>
        <div class="space-y-4">
          <UFormField :label="$t('shopAdmin.items.design')" :help="$t('shopAdmin.items.designHelp')">
            <USelect
              v-model="form.designId"
              :items="(designs ?? []).map(d => ({ label: d.title || d.id.slice(0, 8), value: d.id }))"
              :placeholder="$t('shopAdmin.items.designPlaceholder')"
              class="w-full"
            />
            <p v-if="!designs?.length" class="text-caption text-ink-gray-400 mt-1">
              {{ $t('shopAdmin.items.noDesigns') }} <NuxtLink to="/catalog" class="text-ink-burgundy underline">{{ $t('shopAdmin.items.toCatalog') }}</NuxtLink>
            </p>
          </UFormField>
          <UFormField :label="$t('shopAdmin.items.itemTitle')" required>
            <UInput v-model="form.title" class="w-full" />
          </UFormField>
          <UFormField :label="$t('shopAdmin.items.itemDescription')">
            <UTextarea v-model="form.description" :rows="2" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('shopAdmin.items.price')" :help="$t('shopAdmin.items.priceHelp')">
              <UInput v-model.number="form.price" type="number" min="0" class="w-full">
                <template #trailing><span class="text-caption text-ink-gray-400">₸</span></template>
              </UInput>
            </UFormField>
            <UFormField :label="$t('shopAdmin.items.markup')" :help="$t('shopAdmin.items.markupHelp')">
              <UInput v-model.number="form.markup" type="number" min="0" class="w-full">
                <template #trailing><span class="text-caption text-ink-gray-400">₸</span></template>
              </UInput>
            </UFormField>
          </div>

          <!-- наценка v2: живой расчёт что платит покупатель и что получает владелец -->
          <div class="rounded-lg bg-ink-gray-50 border border-ink-gray-100 p-3 space-y-1.5 text-caption">
            <div class="flex items-center justify-between">
              <span class="text-ink-gray-500">{{ $t('shopAdmin.items.buyerPays') }}</span>
              <span class="font-bold text-ink-black">{{ fmtPrice(buyerPays) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-ink-gray-500">{{ $t('shopAdmin.items.youGet') }}</span>
              <span class="font-bold text-ink-success">{{ fmtPrice(ownerGets) }}</span>
            </div>
            <p class="text-ink-gray-400 pt-0.5">{{ $t('shopAdmin.items.economicsHint', { rate }) }}</p>
          </div>

          <div class="flex items-center gap-4">
            <UFormField :label="$t('shopAdmin.items.sort')">
              <UInput v-model.number="form.sort" type="number" class="w-24" />
            </UFormField>
            <UCheckbox v-model="form.isActive" :label="$t('shopAdmin.items.activeLabel')" class="mt-6" />
          </div>
          <UButton color="primary" block :loading="saving" @click="onSave">
            {{ editing ? $t('shopAdmin.items.save') : $t('shopAdmin.items.add') }}
          </UButton>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
