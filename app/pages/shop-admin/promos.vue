<script setup lang="ts">
// Промокоды магазина (Фаза B5): владелец заводит свои скидочные коды для витрины.
// Скидка — расход владельца (вычитается из его доли; база платформы защищена).
// Применяются на checkout по позициям магазина; учёт использования — при оплате.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t, locale } = useI18n()
useHead({ title: t('shopAdmin.promos.headTitle') })

const { getMine, listPromos, savePromo, deletePromo } = useMyShop()
const toast = useToast()

const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: promos, refresh } = await useAsyncData('my-shop-promos', async () => (shop.value ? listPromos(shop.value.id) : []))

const { money: fmtPrice } = useFormat()
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale.value === 'kk' ? 'kk' : 'ru') : '')

const typeOptions = computed(() => [
  { label: t('shopAdmin.promos.typePercent'), value: 'percent' as string },
  { label: t('shopAdmin.promos.typeFixed'), value: 'fixed' as string },
])

const blank = () => ({
  id: '', code: '', discountType: 'percent' as string, discountValue: 10,
  minOrder: 0, maxUses: null as number | null, expiresAt: '', active: true,
})
const form = reactive(blank())
const saving = ref(false)
const editing = computed(() => !!form.id)
const isPercent = computed(() => form.discountType === 'percent')

function startEdit(p: NonNullable<typeof promos.value>[number]) {
  Object.assign(form, {
    id: p.id, code: p.code, discountType: p.discount_type, discountValue: Number(p.discount_value),
    minOrder: Number(p.min_order), maxUses: p.max_uses, expiresAt: p.expires_at ? p.expires_at.slice(0, 10) : '',
    active: p.active,
  })
}
function reset() { Object.assign(form, blank()) }

async function onSave() {
  if (!shop.value) return
  const code = form.code.trim()
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(code)) { toast.add({ title: t('shopAdmin.promos.codeInvalid'), color: 'warning' }); return }
  if (!(Number(form.discountValue) > 0)) { toast.add({ title: t('shopAdmin.promos.valueInvalid'), color: 'warning' }); return }
  if (isPercent.value && Number(form.discountValue) > 100) { toast.add({ title: t('shopAdmin.promos.percentMax'), color: 'warning' }); return }
  saving.value = true
  try {
    await savePromo({
      id: form.id || undefined,
      shop_id: shop.value.id,
      code,
      discount_type: form.discountType,
      discount_value: Number(form.discountValue) || 0,
      min_order: Number(form.minOrder) || 0,
      max_uses: form.maxUses ? Number(form.maxUses) : null,
      // дата действует до конца выбранного дня (иначе код «сгорал» в полночь)
      expires_at: form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
      active: form.active,
    })
    toast.add({ title: editing.value ? t('shopAdmin.promos.updated') : t('shopAdmin.promos.added'), color: 'success' })
    reset()
    await refresh()
  } catch (e) {
    // уникальность кода в пределах магазина — на БД (индекс), покажем понятную ошибку
    const msg = /duplicate|unique/i.test(getFetchMessage(e)) ? t('shopAdmin.promos.codeTaken') : getFetchMessage(e)
    toast.add({ title: t('shopAdmin.promos.error'), description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}

const busyId = ref<string | null>(null)
async function toggleActive(p: NonNullable<typeof promos.value>[number]) {
  if (busyId.value) return
  busyId.value = p.id
  try {
    await savePromo({ id: p.id, shop_id: p.shop_id, code: p.code, discount_type: p.discount_type, discount_value: p.discount_value, active: !p.active })
    await refresh()
    toast.add({ title: t('states.saved'), color: 'success' })
  } catch (e) { toast.add({ title: t('shopAdmin.promos.error'), description: getFetchMessage(e), color: 'error' }) }
  finally { busyId.value = null }
}

const { confirm } = useConfirm()
async function onDelete(p: NonNullable<typeof promos.value>[number]) {
  const ok = await confirm({ title: t('shopAdmin.promos.deleteConfirm', { code: p.code }), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  try { await deletePromo(p.id); toast.add({ title: t('shopAdmin.promos.deleted'), color: 'success' }); await refresh() }
  catch (e) { toast.add({ title: t('shopAdmin.promos.error'), description: getFetchMessage(e), color: 'error' }) }
}

function isExhausted(p: NonNullable<typeof promos.value>[number]) {
  return (p.max_uses != null && p.used_count >= p.max_uses) || (!!p.expires_at && new Date(p.expires_at).getTime() < Date.now())
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.promos.label')" :title="$t('shopAdmin.promos.title')" :description="$t('shopAdmin.promos.description')" />

    <div class="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      <!-- список кодов -->
      <div>
        <UiEmptyState
          v-if="!promos?.length"
          icon="i-lucide-ticket-percent"
          :title="$t('shopAdmin.promos.emptyTitle')"
          :description="$t('shopAdmin.promos.emptyText')"
        />
        <div v-else class="space-y-3">
          <div
            v-for="p in promos" :key="p.id"
            class="border border-ink-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <code class="font-mono font-bold text-ink-black">{{ p.code }}</code>
                <UBadge v-if="!p.active" color="neutral" variant="subtle" size="sm">{{ $t('shopAdmin.promos.inactive') }}</UBadge>
                <UBadge v-else-if="isExhausted(p)" color="warning" variant="subtle" size="sm">{{ $t('shopAdmin.promos.exhausted') }}</UBadge>
                <UBadge v-else color="success" variant="subtle" size="sm">{{ $t('shopAdmin.promos.live') }}</UBadge>
              </div>
              <p class="text-caption text-ink-gray-500 mt-1">
                <span class="font-semibold text-ink-burgundy">
                  {{ p.discount_type === 'percent' ? `−${Number(p.discount_value)}%` : `−${fmtPrice(Number(p.discount_value))}` }}
                </span>
                <span v-if="Number(p.min_order) > 0"> · {{ $t('shopAdmin.promos.fromSum', { sum: fmtPrice(Number(p.min_order)) }) }}</span>
                <span> · {{ $t('shopAdmin.promos.usedCount', { used: p.used_count, max: p.max_uses ?? '∞' }) }}</span>
                <span v-if="p.expires_at"> · {{ $t('shopAdmin.promos.until', { date: fmtDate(p.expires_at) }) }}</span>
              </p>
            </div>
            <div class="flex items-center gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(p)" />
              <UButton size="xs" color="neutral" variant="ghost" :icon="p.active ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left'" :loading="busyId === p.id" :disabled="!!busyId" @click="toggleActive(p)" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(p)" />
            </div>
          </div>
        </div>
      </div>

      <!-- форма -->
      <UiPanel :title="editing ? $t('shopAdmin.promos.formEdit') : $t('shopAdmin.promos.formAdd')" class="h-fit">
        <template v-if="editing" #actions>
          <UButton size="xs" color="neutral" variant="ghost" @click="reset">{{ $t('shopAdmin.promos.newButton') }}</UButton>
        </template>
        <div class="space-y-4">
          <UFormField :label="$t('shopAdmin.promos.code')" :help="$t('shopAdmin.promos.codeHelp')" required>
            <UInput v-model="form.code" placeholder="TEAM10" class="w-full font-mono" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('shopAdmin.promos.type')">
              <USelect v-model="form.discountType" :items="typeOptions" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.promos.value')" required>
              <UInput v-model.number="form.discountValue" type="number" min="0" class="w-full">
                <template #trailing><span class="text-caption text-ink-gray-400">{{ isPercent ? '%' : '₸' }}</span></template>
              </UInput>
            </UFormField>
          </div>
          <UFormField :label="$t('shopAdmin.promos.minOrder')" :help="$t('shopAdmin.promos.minOrderHelp')">
            <UInput v-model.number="form.minOrder" type="number" min="0" class="w-full">
              <template #trailing><span class="text-caption text-ink-gray-400">₸</span></template>
            </UInput>
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('shopAdmin.promos.maxUses')" :help="$t('shopAdmin.promos.maxUsesHelp')">
              <UInput v-model.number="form.maxUses" type="number" min="1" :placeholder="$t('shopAdmin.promos.unlimited')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.promos.expires')">
              <UInput v-model="form.expiresAt" type="date" class="w-full" />
            </UFormField>
          </div>
          <USwitch v-model="form.active" :label="$t('shopAdmin.promos.activeLabel')" />
          <UButton color="primary" block :loading="saving" @click="onSave">
            {{ editing ? $t('shopAdmin.promos.save') : $t('shopAdmin.promos.add') }}
          </UButton>
          <p class="text-caption text-ink-gray-400">{{ $t('shopAdmin.promos.costHint') }}</p>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
