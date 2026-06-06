<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { CUSTOMER_STATUS } from '~~/shared/config/order-status'

// Трекинг заказа для клиента (§9). Укрупнённые статусы (§5.3). RLS — только свой.
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient<Database>()

const { data: order, error } = await useAsyncData(`order-${id}`, async () => {
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(quantity, unit_price, variants(color_name, size, products(title)))')
    .eq('id', id)
    .single()
  return data
})
if (error.value || !order.value) throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
useHead({ title: `Заказ — INKMADE` })

// укрупнённый прогресс
const STAGES = ['Оформление', 'В производстве', 'Упаковка', 'В пути', 'Доставлен']
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
</script>

<template>
  <section v-if="order" class="max-w-2xl space-y-8">
    <div>
      <UiSectionLabel accent>Заказ #{{ shortId(order.id) }}</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-2">{{ CUSTOMER_STATUS[order.status as OrderStatus] }}</h1>
    </div>

    <!-- прогресс -->
    <div v-if="!isSpecial" class="flex items-center">
      <template v-for="(st, i) in STAGES" :key="st">
        <div class="flex flex-col items-center text-center shrink-0">
          <div
            class="size-8 rounded-full flex items-center justify-center text-caption font-bold"
            :class="i <= current ? 'bg-ink-burgundy text-ink-cream' : 'bg-ink-gray-200 text-ink-gray-400'"
          >{{ i + 1 }}</div>
          <span class="text-caption mt-1 w-20" :class="i <= current ? 'text-ink-black' : 'text-ink-gray-400'">{{ st }}</span>
        </div>
        <div v-if="i < STAGES.length - 1" class="flex-1 h-0.5 mx-1" :class="i < current ? 'bg-ink-burgundy' : 'bg-ink-gray-200'" />
      </template>
    </div>
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

    <UButton to="/account/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Все заказы</UButton>
  </section>
</template>
