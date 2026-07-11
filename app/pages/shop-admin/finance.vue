<script setup lang="ts">

// Финансы магазина (Фаза B4): баланс и история начислений доли с продаж.
// Начисление идёт в apply_paid по order_items.shop_id (revenue_share_pct% от продажи).
// Выплаты откроются с подключением реального платёжного провайдера (блокер #1).
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.finance.headTitle') })

const { getMine, finance } = useMyShop()
const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: fin } = await useAsyncData('my-shop-finance', async () =>
  shop.value ? finance(shop.value.id) : { balance: null, earnings: [] },
)

const { money, dateShort } = useFormat()
const balance = computed(() => fin.value?.balance)
const earnings = computed(() => fin.value?.earnings ?? [])
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.finance.label')" :title="$t('shopAdmin.finance.title')" />

    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <UiStatCard :label="$t('shopAdmin.finance.available')" :value="money(balance?.available)" icon="i-lucide-wallet" accent />
      <UiStatCard :label="$t('shopAdmin.finance.totalEarned')" :value="money(balance?.total_earned)" icon="i-lucide-trending-up" />
      <UiStatCard :label="$t('shopAdmin.finance.totalPaid')" :value="money(balance?.total_paid)" icon="i-lucide-check-check" />
    </div>

    <div class="rounded-lg bg-ink-cream/50 border border-ink-cream-dark px-4 py-3 mb-6 text-caption text-ink-gray-600 flex items-start gap-2">
      <UIcon name="i-lucide-info" class="size-4 mt-0.5 shrink-0" />
      <span>{{ $t('shopAdmin.finance.payoutHint', { pct: shop.revenue_share_pct }) }}</span>
    </div>

    <UiPanel :title="$t('shopAdmin.finance.history')" icon="i-lucide-receipt" :padded="false">
      <div v-if="earnings.length" class="divide-y divide-ink-gray-200">
        <div v-for="e in earnings" :key="e.id" class="flex items-center justify-between px-6 py-3 text-caption">
          <div>
            <span class="text-ink-gray-600">{{ dateShort(e.created_at) }}</span>
            <span class="text-ink-gray-400 ml-2">{{ $t('shopAdmin.finance.fromSale', { base: money(e.sale_base), rate: e.rate_pct }) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <UBadge :color="e.status === 'paid' ? 'neutral' : 'success'" variant="subtle" size="sm">
              {{ e.status === 'paid' ? $t('shopAdmin.finance.statusPaid') : $t('shopAdmin.finance.statusAccrued') }}
            </UBadge>
            <span class="font-semibold">+{{ money(e.amount) }}</span>
          </div>
        </div>
      </div>
      <UiEmptyState v-else icon="i-lucide-wallet" :title="$t('shopAdmin.finance.emptyTitle')" :description="$t('shopAdmin.finance.emptyText')" />
    </UiPanel>
  </div>
</template>
