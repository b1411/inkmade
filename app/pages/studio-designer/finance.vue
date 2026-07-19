<script setup lang="ts">
// Финансы дизайнера (CRM §4.3): баланс, начисления, выплаты.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()
const toast = useToast()
const { t } = useI18n()

const { data, refresh, pending, error } = await useAsyncData('designer-finance', async () => {
  const [balance, earnings, payouts, profile, rates] = await Promise.all([
    d.balance(), d.earnings(100), d.payouts(), d.profile(), d.rateHistory(),
  ])
  return { balance, earnings, payouts, profile, rates }
})

const { money, date, number } = useFormat()
const MIN_PAYOUT = 5000

const amount = ref<number>(0)
const requesting = ref(false)
async function requestPayout() {
  const avail = Number(data.value?.balance?.available) || 0
  if (amount.value < MIN_PAYOUT) { toast.add({ title: t('studio.designer.finance.toast.minPayout', { min: MIN_PAYOUT }), color: 'warning' }); return }
  if (amount.value > avail) { toast.add({ title: t('studio.designer.finance.toast.overBalance'), color: 'warning' }); return }
  requesting.value = true
  try {
    await d.requestPayout(amount.value)
    amount.value = 0
    await refresh()
    toast.add({ title: t('studio.designer.finance.toast.payoutRequested'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('studio.designer.finance.toast.error'), description: getFetchMessage(e, t('studio.designer.finance.toast.failed')), color: 'error' })
  } finally { requesting.value = false }
}
const payoutColor = (s: string) => s === 'paid' ? 'success' : s === 'rejected' ? 'error' : 'neutral'
const eStatus = computed<Record<string, string>>(() => ({
  accrued: t('studio.designer.finance.earningStatus.accrued'),
  paid: t('studio.designer.finance.earningStatus.paid'),
  reversed: t('studio.designer.finance.earningStatus.reversed'),
}))
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.designer.finance.label')" :title="$t('studio.designer.finance.title')" :description="$t('studio.designer.finance.description')" />

    <div v-if="pending" class="space-y-4">
      <div class="grid sm:grid-cols-3 gap-4"><UiSkeleton v-for="n in 3" :key="n" rounded="rounded-lg" class="h-24" /></div>
      <UiSkeleton rounded="rounded-lg" class="h-44" />
      <UiSkeleton rounded="rounded-lg" class="h-72" />
    </div>
    <UiEmptyState v-else-if="error" icon="i-lucide-triangle-alert" :title="$t('studio.designer.finance.loadErrorTitle')" :text="$t('studio.designer.finance.loadErrorText')">
      <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="() => refresh()">{{ $t('states.retry') }}</UButton>
    </UiEmptyState>
    <div v-else class="space-y-8">
      <div class="grid sm:grid-cols-3 gap-4">
        <UiStatCard :label="$t('studio.designer.finance.accrued')" :value="money(data?.balance?.total_earned)" icon="i-lucide-trending-up" />
        <UiStatCard :label="$t('studio.designer.finance.paid')" :value="money(data?.balance?.total_paid)" icon="i-lucide-banknote" />
        <UiStatCard :label="$t('studio.designer.finance.available')" :value="money(data?.balance?.available)" icon="i-lucide-wallet" accent />
      </div>

      <!-- заявка на выплату -->
      <UiPanel :title="$t('studio.designer.finance.requestPayout')" icon="i-lucide-hand-coins" class="max-w-md">
        <div class="flex items-end gap-2">
          <UFormField :label="$t('studio.designer.finance.amount')" class="flex-1"><UInput v-model.number="amount" type="number" :min="MIN_PAYOUT" class="w-full" /></UFormField>
          <UButton color="primary" size="lg" :loading="requesting" @click="requestPayout">{{ $t('studio.designer.finance.request') }}</UButton>
        </div>
        <p class="text-caption text-ink-gray-400 mt-3">{{ $t('studio.designer.finance.minHint', { min: number(MIN_PAYOUT), rate: data?.profile?.royalty_pct ?? '—' }) }}</p>
      </UiPanel>

      <!-- история начислений -->
      <UiPanel :title="$t('studio.designer.finance.accrualHistory')" icon="i-lucide-list" :padded="false">
        <div v-if="!data?.earnings?.length" class="px-6 py-4 text-ink-gray-600 text-caption">{{ $t('studio.designer.finance.noAccruals') }}</div>
        <div v-else class="divide-y divide-ink-gray-200">
          <div v-for="e in data!.earnings" :key="e.id" class="flex items-center justify-between gap-3 px-6 py-3 text-caption">
            <span class="truncate">{{ e.print_library?.title ?? $t('studio.designer.finance.printFallback') }}</span>
            <span class="text-ink-gray-500 shrink-0">{{ e.rate_pct }}% · {{ date(e.created_at) }}</span>
            <span class="shrink-0">{{ eStatus[e.status] }}</span>
            <span class="font-semibold text-ink-success shrink-0">+{{ money(e.amount) }}</span>
          </div>
        </div>
      </UiPanel>

      <!-- выплаты -->
      <UiPanel :title="$t('studio.designer.finance.payouts')" icon="i-lucide-arrow-down-to-line" :padded="false">
        <div v-if="!data?.payouts?.length" class="px-6 py-4 text-ink-gray-600 text-caption">{{ $t('studio.designer.finance.noPayouts') }}</div>
        <div v-else class="divide-y divide-ink-gray-200">
          <div v-for="p in data!.payouts" :key="p.id" class="flex items-center justify-between gap-3 px-6 py-3 text-caption">
            <span>{{ date(p.requested_at) }}</span>
            <span class="font-semibold">{{ money(p.amount) }}</span>
            <UBadge :color="payoutColor(p.status)" variant="subtle" size="xs">{{ $t(`domain.payoutStatus.${p.status}`) }}</UBadge>
          </div>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
