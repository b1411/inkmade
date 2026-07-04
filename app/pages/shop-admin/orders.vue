<script setup lang="ts">
import { formatDate } from '~/utils/format'

// Заказы магазина (Tier1 B): продажи с атрибуцией order_items.shop_id. Владелец видит
// только позиции своего магазина + минимум PII покупателя (имя/город) — данные отдаёт
// SECURITY DEFINER RPC shop_orders (order_items/orders закрыты RLS покупателя).
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t, te } = useI18n()
useHead({ title: t('shopAdmin.orders.headTitle') })

const { getMine, orders } = useMyShop()
const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: list, pending } = await useAsyncData('my-shop-orders', async () =>
  shop.value ? orders(shop.value.id) : [],
)

const money = (n: number | null | undefined) => `${new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0))} ₸`
const rows = computed(() => list.value ?? [])
const statusLabel = (s: string) => (te(`admin.dashboard.status.${s}`) ? t(`admin.dashboard.status.${s}`) : s)
const statusColor = (s: string) =>
  s === 'delivered' ? 'success'
    : s === 'cancelled' || s === 'refunded' ? 'error'
      : s === 'on_hold' || s === 'reprint' ? 'warning'
        : s === 'created' || s === 'pending' ? 'neutral'
          : 'info'

// сводка: продано (оплаченные) и начислено
const paidCount = computed(() => rows.value.filter(o => o.paid).length)
const soldSum = computed(() => rows.value.filter(o => o.paid).reduce((s, o) => s + Number(o.subtotal || 0), 0))
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.orders.label')" :title="$t('shopAdmin.orders.title')" :description="$t('shopAdmin.orders.description')" />

    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <UiStatCard :label="$t('shopAdmin.orders.totalOrders')" :value="rows.length" icon="i-lucide-shopping-bag" />
      <UiStatCard :label="$t('shopAdmin.orders.paidOrders')" :value="paidCount" icon="i-lucide-check-check" />
      <UiStatCard :label="$t('shopAdmin.orders.soldSum')" :value="money(soldSum)" icon="i-lucide-trending-up" accent />
    </div>

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-xl" class="h-24" />
    </div>

    <UiEmptyState
      v-else-if="!rows.length"
      icon="i-lucide-receipt"
      :title="$t('shopAdmin.orders.emptyTitle')"
      :description="$t('shopAdmin.orders.emptyText')"
    />

    <div v-else class="space-y-3">
      <div v-for="o in rows" :key="o.id" class="rounded-xl border border-ink-gray-200 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-caption text-ink-gray-500">#{{ o.id.slice(0, 8) }}</span>
              <UBadge :color="statusColor(o.status)" variant="subtle" size="sm">{{ statusLabel(o.status) }}</UBadge>
            </div>
            <p class="text-caption text-ink-gray-500 mt-1">
              {{ formatDate(o.created_at) }}
              <template v-if="o.buyer_name"> · {{ o.buyer_name }}</template>
              <template v-if="o.city"> · {{ o.city }}</template>
            </p>
          </div>
          <div class="text-right">
            <p class="font-bold">{{ money(o.subtotal) }}</p>
            <p v-if="o.paid" class="text-caption text-ink-success">+{{ money(o.earned) }} {{ $t('shopAdmin.orders.earned') }}</p>
            <p v-else class="text-caption text-ink-gray-400">{{ $t('shopAdmin.orders.awaitingPay') }}</p>
          </div>
        </div>

        <ul class="mt-3 pt-3 border-t border-ink-gray-100 space-y-1">
          <li v-for="(it, i) in o.items" :key="i" class="flex items-center justify-between text-caption">
            <span class="text-ink-gray-600 truncate">
              {{ it.title || '—' }}
              <span v-if="it.color_name || it.size" class="text-ink-gray-400">
                ({{ [it.color_name, it.size].filter(Boolean).join(', ') }})
              </span>
              <span class="text-ink-gray-400"> × {{ it.quantity }}</span>
            </span>
            <span class="font-medium shrink-0 ml-3">{{ money(it.line_total) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
