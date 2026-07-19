<script setup lang="ts">

// Финансы магазина (Фаза B4): баланс и история начислений доли с продаж.
// Начисление идёт в apply_paid по order_items.shop_id (revenue_share_pct% от продажи).
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.finance.headTitle') })

const { getMine, finance, requestPayout } = useMyShop()
const { data: shop, pending: shopPending, error: shopError } = await useAsyncData('my-shop', () => getMine())
const { data: fin, pending: financePending, error: financeError, refresh } = await useAsyncData('my-shop-finance', async () =>
  shop.value ? finance(shop.value.id) : { balance: null, earnings: [], payouts: [] },
)

const { money, dateShort } = useFormat()
const balance = computed(() => fin.value?.balance)
const earnings = computed(() => fin.value?.earnings ?? [])
const payouts = computed(() => fin.value?.payouts ?? [])
const pendingPayout = computed(() => payouts.value.find(item => item.status === 'requested') ?? null)
const MIN_PAYOUT = 5000
const payout = reactive({ bank: '', account: '', busy: false })

async function submitPayout() {
  if (!shop.value || payout.busy || pendingPayout.value) return
  if (Number(balance.value?.available ?? 0) < MIN_PAYOUT) {
    useToast().add({ title: t('shopAdmin.finance.payoutMin', { amount: money(MIN_PAYOUT) }), color: 'warning' })
    return
  }
  if (!payout.bank.trim() || !payout.account.trim()) {
    useToast().add({ title: t('shopAdmin.finance.payoutDetailsRequired'), color: 'warning' })
    return
  }
  payout.busy = true
  try {
    await requestPayout(shop.value.id, 'bank_transfer', { bank: payout.bank.trim(), account: payout.account.trim() })
    payout.bank = ''
    payout.account = ''
    await refresh()
    useToast().add({ title: t('shopAdmin.finance.payoutRequested'), color: 'success' })
  } catch (error) {
    useToast().add({ title: t('shopAdmin.finance.payoutError'), description: getFetchMessage(error), color: 'error' })
  } finally {
    payout.busy = false
  }
}

const payoutColor = (status: string) => status === 'paid' ? 'success' : status === 'rejected' ? 'error' : 'warning'
</script>

<template>
  <div v-if="shopPending || financePending" class="space-y-4">
    <UiSkeleton rounded="rounded-lg" class="h-24" />
    <UiSkeleton rounded="rounded-lg" class="h-44" />
    <UiSkeleton rounded="rounded-lg" class="h-72" />
  </div>
  <UiEmptyState
    v-else-if="shopError || financeError" icon="i-lucide-triangle-alert"
    :title="$t('shopAdmin.finance.loadErrorTitle')" :text="$t('shopAdmin.finance.loadErrorText')"
  >
      <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="() => refresh()">{{ $t('states.retry') }}</UButton>
  </UiEmptyState>
  <div v-else-if="shop">
    <UiPageHeader :label="$t('shopAdmin.finance.label')" :title="$t('shopAdmin.finance.title')" />

    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <UiStatCard :label="$t('shopAdmin.finance.available')" :value="money(balance?.available)" icon="i-lucide-wallet" accent />
      <UiStatCard :label="$t('shopAdmin.finance.totalEarned')" :value="money(balance?.total_earned)" icon="i-lucide-trending-up" />
      <UiStatCard :label="$t('shopAdmin.finance.totalPaid')" :value="money(balance?.total_paid)" icon="i-lucide-check-check" />
    </div>

    <div class="rounded-lg bg-ink-cream/50 border border-ink-cream-dark px-4 py-3 mb-6 text-caption text-ink-gray-600 flex items-start gap-2">
      <UIcon name="i-lucide-info" class="size-4 mt-0.5 shrink-0" />
      <span>{{ $t('shopAdmin.finance.payoutHint', { pct: shop.revenue_share_pct, min: money(MIN_PAYOUT) }) }}</span>
    </div>

    <div class="mb-6 grid items-start gap-6 lg:grid-cols-2">
      <UiPanel :title="$t('shopAdmin.finance.requestTitle')" icon="i-lucide-hand-coins">
        <div v-if="pendingPayout" class="space-y-3" role="status">
          <UAlert color="warning" variant="subtle" icon="i-lucide-clock" :title="$t('shopAdmin.finance.pendingTitle')" :description="$t('shopAdmin.finance.pendingText', { amount: money(pendingPayout.amount) })" />
        </div>
        <form v-else class="space-y-4" @submit.prevent="submitPayout">
          <p class="text-caption text-ink-gray-600">{{ $t('shopAdmin.finance.requestText', { amount: money(balance?.available) }) }}</p>
          <UFormField :label="$t('shopAdmin.finance.bank')" required>
            <UInput v-model="payout.bank" autocomplete="organization" class="w-full" />
          </UFormField>
          <UFormField :label="$t('shopAdmin.finance.account')" :help="$t('shopAdmin.finance.accountHelp')" required>
            <UInput v-model="payout.account" autocomplete="off" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block icon="i-lucide-send" :loading="payout.busy" :disabled="Number(balance?.available ?? 0) < MIN_PAYOUT">
            {{ $t('shopAdmin.finance.requestButton') }}
          </UButton>
        </form>
      </UiPanel>

      <UiPanel :title="$t('shopAdmin.finance.payoutHistory')" icon="i-lucide-landmark" :padded="false">
        <div v-if="payouts.length" class="divide-y divide-ink-gray-200">
          <div v-for="item in payouts" :key="item.id" class="flex items-center justify-between gap-3 px-6 py-3 text-caption">
            <span class="text-ink-gray-500">{{ dateShort(item.requested_at) }}</span>
            <span class="font-semibold">{{ money(item.amount) }}</span>
            <UBadge :color="payoutColor(item.status)" variant="subtle" size="xs">{{ $t(`shopAdmin.finance.payoutStatus.${item.status}`) }}</UBadge>
          </div>
        </div>
        <UiEmptyState v-else compact icon="i-lucide-landmark" :title="$t('shopAdmin.finance.noPayouts')" />
      </UiPanel>
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
