<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'

// Трекинг заказа для клиента (§9). Укрупнённые статусы (§5.3). RLS — только свой.
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient<Database>()

const { data: order, error, refresh } = await useAsyncData(`order-${id}`, async () => {
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(quantity, unit_price, designs(preview_url), variants(color_name, size, products(title)))')
    .eq('id', id)
    .single()
  return data
})
if (error.value || !order.value) throw createError({ statusCode: 404, statusMessage: t('cart.order.notFound') })
useHead({ title: () => `${t('cart.order.headTitle')} — INKMADE` })

// Realtime: оператор меняет этап → клиент видит мгновенно (CRM синхронизация)
onMounted(() => {
  const channel = supabase
    .channel(`order-track-${id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () => refresh())
    .subscribe()
  onBeforeUnmount(() => { supabase.removeChannel(channel) })
})

// повтор заказа (CRM §3.2)
const { reorder } = useOrder()
const notify = useNotify()
const reordering = ref(false)
async function onReorder() {
  reordering.value = true
  try {
    const n = await reorder(id)
    notify.success(t('cart.order.reorderSuccess', { count: n }))
    await navigateTo('/cart')
  } catch (e) {
    notify.error(t('cart.order.reorderError'), (e as Error).message)
  } finally {
    reordering.value = false
  }
}

// укрупнённый прогресс — статусы для клиента (§6.6)
const STAGES = computed(() => [
  t('cart.status.stages.placed'),
  t('cart.status.stages.printing'),
  t('cart.status.stages.packing'),
  t('cart.status.stages.shipping'),
  t('cart.status.stages.delivered'),
])
const stageIndex = (s: OrderStatus): number => {
  if (['created', 'pending'].includes(s)) return 0
  if (['paid', 'queued', 'printing', 'quality_check', 'reprint'].includes(s)) return 1
  if (['packing', 'ready_to_ship'].includes(s)) return 2
  if (s === 'shipped') return 3
  if (s === 'delivered') return 4
  return -1 // on_hold/cancelled/refunded
}
const current = computed(() => stageIndex(order.value!.status as OrderStatus))
const isSpecial = computed(() => current.value === -1)
const shortId = (s: string) => s.slice(0, 8)

// Укрупнённый статус для клиента → стабильный i18n-ключ (латиница).
// Зеркалит CUSTOMER_STATUS из shared/config/order-status.ts (§5.3).
const STATUS_KEY: Record<OrderStatus, string> = {
  created: 'created',
  pending: 'pending',
  paid: 'in_production',
  queued: 'in_production',
  printing: 'in_production',
  quality_check: 'in_production',
  packing: 'packing',
  ready_to_ship: 'packing',
  shipped: 'shipped',
  delivered: 'delivered',
  on_hold: 'on_hold',
  reprint: 'in_production',
  cancelled: 'cancelled',
  refunded: 'refunded',
}
const customerStatus = computed(() => t(`cart.status.${STATUS_KEY[order.value!.status as OrderStatus]}`))

// чек об оплате (§3.1). fiscal_receipt пишет apply_paid при подтверждении оплаты.
interface FiscalReceipt {
  status?: string
  provider?: string
  provider_txn?: string
  amount?: number
  currency?: string
  issued_at?: string
  note?: string
}
const receipt = computed(() => (order.value?.fiscal_receipt ?? null) as FiscalReceipt | null)
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n))
function printReceipt() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <section v-if="order" class="max-w-2xl space-y-8">
    <div>
      <UiSectionLabel accent>{{ $t('cart.order.number', { id: shortId(order.id) }) }}</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-2">{{ customerStatus }}</h1>
    </div>

    <!-- прогресс (§6.6) -->
    <OrderStatusTracker v-if="!isSpecial" :stages="STAGES" :current="current" />
    <UAlert v-else color="warning" variant="subtle" :title="customerStatus" />

    <!-- трек -->
    <UiPanel v-if="order.tracking_no" :title="$t('cart.order.tracking.title')" icon="i-lucide-truck">
      <p class="font-semibold">{{ order.tracking_no }} <span class="text-ink-gray-600 font-normal">· {{ order.carrier }}</span></p>
    </UiPanel>

    <!-- позиции -->
    <UiPanel :title="$t('cart.order.items.title')" icon="i-lucide-package">
      <div class="space-y-1">
        <div v-for="(it, i) in order.order_items" :key="i" class="flex justify-between border-b border-ink-gray-200 py-2 last:border-0">
          <span>{{ it.variants?.products?.title }} · {{ it.variants?.color_name }}/{{ it.variants?.size }} ×{{ it.quantity }}</span>
          <span class="font-semibold">{{ it.unit_price * it.quantity }} ₸</span>
        </div>
        <div class="flex justify-between pt-2 font-bold">
          <span>{{ $t('cart.order.items.total') }}</span><span class="text-ink-burgundy">{{ order.total }} {{ order.currency }}</span>
        </div>
      </div>
    </UiPanel>

    <!-- подарок (§3.1) -->
    <div v-if="order.is_gift" class="border border-ink-burgundy/40 bg-ink-burgundy/5 rounded-lg p-4 text-caption space-y-1">
      <p class="ink-label text-ink-burgundy flex items-center gap-1.5"><UIcon name="i-lucide-gift" class="size-3.5" /> {{ $t('cart.order.gift.title') }}</p>
      <p v-if="order.gift_recipient">{{ $t('cart.order.gift.recipient') }} <strong>{{ order.gift_recipient }}</strong></p>
      <p v-if="order.gift_message">{{ $t('cart.order.gift.card') }} «{{ order.gift_message }}»</p>
      <p v-if="order.gift_hide_price" class="text-ink-gray-500">{{ $t('cart.order.gift.hidePrice') }}</p>
    </div>

    <!-- чек об оплате (§3.1) -->
    <UiPanel v-if="order.paid_at" :title="$t('cart.order.receipt.title')" icon="i-lucide-receipt">
      <template #actions>
        <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-printer" @click="printReceipt">{{ $t('cart.order.receipt.print') }}</UButton>
      </template>
      <div class="space-y-1">
        <p class="font-semibold">{{ fmt(order.total) }} {{ order.currency }}</p>
        <p class="text-caption text-ink-gray-600">{{ $t('cart.order.receipt.paidAt', { date: new Date(order.paid_at).toLocaleString('ru') }) }}</p>
        <p v-if="receipt?.provider_txn" class="text-caption text-ink-gray-600">{{ $t('cart.order.receipt.transaction', { txn: receipt.provider_txn }) }}</p>
        <p v-if="receipt?.status === 'pending_fiscalization'" class="text-caption text-ink-gray-400">
          {{ $t('cart.order.receipt.pendingFiscal') }}
        </p>
      </div>
    </UiPanel>

    <div class="flex flex-wrap gap-3">
      <UButton to="/account/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('cart.order.actions.allOrders') }}</UButton>
      <UButton color="primary" variant="subtle" icon="i-lucide-repeat" :loading="reordering" @click="onReorder">{{ $t('cart.order.actions.reorder') }}</UButton>
      <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-shopping-bag">{{ $t('cart.order.actions.toCatalog') }}</UButton>
    </div>
  </section>
</template>
