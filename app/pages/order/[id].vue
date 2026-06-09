<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { CUSTOMER_STATUS } from '~~/shared/config/order-status'

// Трекинг заказа для клиента (§9). Укрупнённые статусы (§5.3). RLS — только свой.
definePageMeta({ middleware: 'auth' })
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
if (error.value || !order.value) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
useHead({ title: `Заказ — INKMADE` })

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
    notify.success(`Добавлено в корзину: ${n}`)
    await navigateTo('/cart')
  } catch (e) {
    notify.error('Не удалось повторить', (e as Error).message)
  } finally {
    reordering.value = false
  }
}

// укрупнённый прогресс — статусы для клиента (§6.6)
const STAGES = ['Оформлен', 'Печатаем', 'Упаковываем', 'В пути', 'Доставлен']
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
      <UiSectionLabel accent>Заказ #{{ shortId(order.id) }}</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-2">{{ CUSTOMER_STATUS[order.status as OrderStatus] }}</h1>
    </div>

    <!-- прогресс (§6.6) -->
    <OrderStatusTracker v-if="!isSpecial" :stages="STAGES" :current="current" />
    <UAlert v-else color="warning" variant="subtle" :title="CUSTOMER_STATUS[order.status as OrderStatus]" />

    <!-- трек -->
    <div v-if="order.tracking_no" class="border border-ink-gray-200 rounded-lg p-4">
      <p class="ink-label text-ink-gray-600">Отслеживание</p>
      <p class="font-semibold">{{ order.tracking_no }} <span class="text-ink-gray-600 font-normal">· {{ order.carrier }}</span></p>
    </div>

    <!-- позиции -->
    <div class="space-y-2">
      <UiSectionLabel>Состав</UiSectionLabel>
      <div v-for="(it, i) in order.order_items" :key="i" class="flex justify-between border-b border-ink-gray-200 py-2">
        <span>{{ it.variants?.products?.title }} · {{ it.variants?.color_name }}/{{ it.variants?.size }} ×{{ it.quantity }}</span>
        <span class="font-semibold">{{ it.unit_price * it.quantity }} ₸</span>
      </div>
      <div class="flex justify-between pt-2 font-bold">
        <span>Итого</span><span class="text-ink-burgundy">{{ order.total }} {{ order.currency }}</span>
      </div>
    </div>

    <!-- подарок (§3.1) -->
    <div v-if="order.is_gift" class="border border-ink-burgundy/40 bg-ink-burgundy/5 rounded-lg p-4 text-caption space-y-1">
      <p class="ink-label text-ink-burgundy flex items-center gap-1.5"><UIcon name="i-lucide-gift" class="size-3.5" /> Подарочный заказ</p>
      <p v-if="order.gift_recipient">Получатель: <strong>{{ order.gift_recipient }}</strong></p>
      <p v-if="order.gift_message">Открытка: «{{ order.gift_message }}»</p>
      <p v-if="order.gift_hide_price" class="text-ink-gray-500">Чек с ценой не вкладывается в посылку.</p>
    </div>

    <!-- чек об оплате (§3.1) -->
    <div v-if="order.paid_at" class="border border-ink-gray-200 rounded-lg p-4 space-y-1">
      <div class="flex items-center justify-between">
        <p class="ink-label text-ink-gray-600">Чек об оплате</p>
        <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-printer" @click="printReceipt">Печать</UButton>
      </div>
      <p class="font-semibold">{{ fmt(order.total) }} {{ order.currency }}</p>
      <p class="text-caption text-ink-gray-600">Оплачено: {{ new Date(order.paid_at).toLocaleString('ru') }}</p>
      <p v-if="receipt?.provider_txn" class="text-caption text-ink-gray-600">Транзакция: {{ receipt.provider_txn }}</p>
      <p v-if="receipt?.status === 'pending_fiscalization'" class="text-caption text-ink-gray-400">
        Фискальный чек ОФД будет доступен после фискализации.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <UButton to="/account/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Все заказы</UButton>
      <UButton color="primary" variant="subtle" icon="i-lucide-repeat" :loading="reordering" @click="onReorder">Повторить заказ</UButton>
      <UButton to="/catalog" color="neutral" variant="ghost" icon="i-lucide-shopping-bag">В каталог</UButton>
    </div>
  </section>
</template>
