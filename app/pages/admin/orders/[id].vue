<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { TRANSITIONS, REASON_REQUIRED } from '~~/shared/config/order-status'

// Карточка заказа в админке (§8.2.3): позиции, адрес, оплата, лог, ручное управление.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()

const route = useRoute()
const id = route.params.id as string
const { getOrderAdmin } = useAdmin()
const { changeStatus, addEvidence, listEvidence } = useStudio()
const { refundOrder } = useFinance()
const toast = useToast()

// доказательная база (§6.8)
const evidence = ref<{ id: string; kind: string; note: string | null; url: string | null }[]>([])
const evUploading = ref(false)
const evInput = ref<HTMLInputElement | null>(null)
const kindLabel = (k: string) => t(`admin.order.kindLabels.${k}`)
async function loadEvidence() {
  try { evidence.value = await listEvidence(id) } catch { /* не критично */ }
}
onMounted(loadEvidence)
async function onEvidencePick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  evUploading.value = true
  try {
    await addEvidence(id, file, 'defect')
    if (evInput.value) evInput.value.value = ''
    await loadEvidence()
    toast.add({ title: t('admin.order.toast.photoAdded'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('admin.order.toast.uploadError'), description: (err as Error).message, color: 'error' })
  } finally { evUploading.value = false }
}

const { data: order, refresh } = await useAsyncData(`admin-order-${id}`, () => getOrderAdmin(id))

// маржа по заказу (§6.2): выручка позиций − себестоимость позиций
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n))
const margin = computed(() => {
  const items = order.value?.order_items ?? []
  const revenue = items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0)
  const cost = items.reduce((s, it) => s + Number(it.unit_cost) * it.quantity, 0)
  return { revenue, cost, profit: revenue - cost }
})

const nextStates = computed<OrderStatus[]>(() => TRANSITIONS[(order.value?.status as OrderStatus) ?? 'paid'] ?? [])
const modal = reactive({ open: false, to: '' as OrderStatus, note: '', trackingNo: '', carrier: '' })
const busy = ref(false)

function start(to: OrderStatus) {
  if (to === 'shipped' || REASON_REQUIRED.includes(to)) Object.assign(modal, { open: true, to, note: '', trackingNo: '', carrier: '' })
  else perform(to)
}
async function perform(to: OrderStatus, opts?: { note?: string; trackingNo?: string; carrier?: string }) {
  busy.value = true
  try {
    // возврат идёт через refund_order: статус + реверс роялти + леджер (§7.3)
    if (to === 'refunded') await refundOrder(id, opts?.note)
    else await changeStatus(id, to, opts)
    toast.add({ title: t('admin.order.toast.statusChanged', { status: t(`domain.orderStatus.${to}`) }), color: 'success' })
    modal.open = false
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.order.toast.error'), description: (e as { data?: { message?: string } }).data?.message ?? (e as Error).message, color: 'error' })
  } finally { busy.value = false }
}

const addr = computed(() => order.value?.shipping_addr as Record<string, string> | null)
const shortId = (s: string) => s.slice(0, 8)
</script>

<template>
  <div v-if="order">
    <UiPageHeader :label="$t('admin.order.label', { id: shortId(order.id) })" :title="$t(`domain.orderStatus.${order.status}`)">
      <template #actions>
        <UButton to="/admin/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('admin.order.backToList') }}</UButton>
      </template>
    </UiPageHeader>

    <div class="grid lg:grid-cols-[1fr_300px] gap-8">
      <div class="space-y-4">
        <!-- позиции с маржой (§6.4: admin видит цену, себестоимость, прибыль) -->
        <UiPanel v-for="it in order.order_items" :key="it.id">
          <p class="font-semibold">{{ it.variants?.products?.title }} · {{ it.variants?.color_name }}/{{ it.variants?.size }} ×{{ it.quantity }}</p>
          <p class="text-caption text-ink-gray-600 mt-1">
            {{ $t('admin.order.item.price') }} {{ fmt(Number(it.unit_price)) }} ₸ · {{ $t('admin.order.item.cost') }} {{ fmt(Number(it.unit_cost)) }} ₸ ·
            <span :class="Number(it.unit_price) - Number(it.unit_cost) > 0 ? 'text-ink-burgundy font-semibold' : 'text-ink-error font-semibold'">
              {{ $t('admin.order.item.margin') }} {{ fmt((Number(it.unit_price) - Number(it.unit_cost)) * it.quantity) }} ₸
            </span>
            · {{ it.print_method }}
          </p>
        </UiPanel>

        <!-- сводка прибыли по заказу -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="border border-ink-gray-200 rounded-lg p-3">
            <p class="ink-label text-ink-gray-400">{{ $t('admin.order.marginCard.revenue') }}</p>
            <p class="font-bold mt-1">{{ fmt(margin.revenue) }} ₸</p>
          </div>
          <div class="border border-ink-gray-200 rounded-lg p-3">
            <p class="ink-label text-ink-gray-400">{{ $t('admin.order.marginCard.cost') }}</p>
            <p class="font-bold mt-1">{{ fmt(margin.cost) }} ₸</p>
          </div>
          <div class="border-2 border-ink-burgundy rounded-lg p-3 bg-ink-burgundy/5">
            <p class="ink-label text-ink-burgundy">{{ $t('admin.order.marginCard.margin') }}</p>
            <p class="font-bold text-ink-burgundy mt-1">{{ fmt(margin.profit) }} ₸</p>
          </div>
        </div>

        <!-- подарок -->
        <div v-if="order.is_gift" class="border border-ink-burgundy/40 bg-ink-burgundy/5 rounded-lg p-4 text-caption space-y-1">
          <p class="ink-label text-ink-burgundy flex items-center gap-1.5"><UIcon name="i-lucide-gift" class="size-3.5" /> {{ $t('admin.order.gift.title') }}</p>
          <p v-if="order.gift_recipient">{{ $t('admin.order.gift.recipient', { name: order.gift_recipient }) }}</p>
          <p v-if="order.gift_message">{{ $t('admin.order.gift.card', { message: order.gift_message }) }}</p>
          <p v-if="order.gift_hide_price">{{ $t('admin.order.gift.hidePrice') }}</p>
        </div>

        <!-- адрес + оплата -->
        <UiPanel :title="$t('admin.order.delivery.title')" icon="i-lucide-truck">
          <div class="text-caption space-y-1">
            <p v-if="addr">{{ addr.full_name }}, {{ addr.phone }} — {{ addr.city }}, {{ addr.address }}</p>
            <p v-if="order.tracking_no">{{ $t('admin.order.delivery.tracking', { no: order.tracking_no, carrier: order.carrier }) }}</p>
            <p>{{ $t('admin.order.delivery.payment', { value: order.paid_at ? new Date(order.paid_at).toLocaleString('ru') : $t('admin.order.delivery.notPaid') }) }}</p>
          </div>
        </UiPanel>

        <!-- лог -->
        <UiPanel :title="$t('admin.order.log.title')" icon="i-lucide-history">
          <ul class="space-y-1 text-caption">
            <li v-for="l in (order.order_status_log ?? []).slice().reverse()" :key="l.id" class="flex gap-2">
              <span class="text-ink-gray-400">{{ new Date(l.created_at).toLocaleString('ru') }}</span>
              <span>{{ l.from_status }} → <strong>{{ l.to_status }}</strong></span>
              <span v-if="l.note" class="text-ink-gray-600">— {{ l.note }}</span>
            </li>
          </ul>
        </UiPanel>

        <!-- доказательная база (§6.8) -->
        <UiPanel :title="$t('admin.order.evidence.title')" icon="i-lucide-camera">
          <template #actions>
            <input ref="evInput" type="file" accept="image/*" class="hidden" @change="onEvidencePick">
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-camera" :loading="evUploading" @click="evInput?.click()">{{ $t('admin.order.evidence.add') }}</UButton>
          </template>
          <div v-if="evidence.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <a v-for="e in evidence" :key="e.id" :href="e.url ?? '#'" target="_blank">
              <img v-if="e.url" :src="e.url" :alt="kindLabel(e.kind)" class="aspect-square w-full object-cover rounded-md border border-ink-gray-200">
              <span class="text-[10px] text-ink-gray-500 block truncate">{{ kindLabel(e.kind) }}</span>
            </a>
          </div>
          <p v-else class="text-caption text-ink-gray-400">{{ $t('admin.order.evidence.empty') }}</p>
        </UiPanel>
      </div>

      <UiPanel :title="$t('admin.order.control.title')" icon="i-lucide-settings-2" class="h-fit">
        <div class="space-y-3">
          <UButton
            v-for="to in nextStates"
            :key="to"
            :color="['reprint','cancelled','refunded'].includes(to) ? 'error' : to === 'on_hold' ? 'warning' : 'primary'"
            variant="subtle" block :loading="busy"
            @click="start(to)"
          >{{ $t(`domain.orderStatus.${to}`) }}</UButton>
          <p v-if="!nextStates.length" class="text-caption text-ink-gray-400">{{ $t('admin.order.control.final') }}</p>
        </div>
      </UiPanel>
    </div>

    <UModal v-model:open="modal.open" :title="$t(`domain.orderStatus.${modal.to}`)">
      <template #body>
        <div class="space-y-4">
          <template v-if="modal.to === 'shipped'">
            <UFormField :label="$t('admin.order.modal.trackingNo')" required><UInput v-model="modal.trackingNo" class="w-full" /></UFormField>
            <UFormField :label="$t('admin.order.modal.carrier')" required><UInput v-model="modal.carrier" class="w-full" /></UFormField>
          </template>
          <UFormField v-else :label="$t('admin.order.modal.reason')" required><UTextarea v-model="modal.note" :rows="3" class="w-full" /></UFormField>
          <UButton color="primary" block :loading="busy" @click="perform(modal.to, { note: modal.note, trackingNo: modal.trackingNo, carrier: modal.carrier })">{{ $t('admin.order.modal.confirm') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
