<script setup lang="ts">
// Дашборд дизайнера (CRM §4.1): заработок на виду + последние продажи.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()
const { t } = useI18n()

const { data, refresh } = await useAsyncData('designer-dash', async () => {
  const [profile, balance, earnings, prints, stats] = await Promise.all([
    d.profile(), d.balance(), d.earnings(20), d.myPrints(), d.printStats(),
  ])
  return { profile, balance, earnings, prints, stats }
})

// топ принтов по сумме роялти (CRM §4.1)
const topPrints = computed(() => {
  const prints = data.value?.prints ?? []
  const stats = data.value?.stats ?? {}
  return prints
    .map(p => ({ id: p.id, title: p.title, ...(stats[p.id] ?? { sales: 0, royalty: 0 }) }))
    .filter(p => p.sales > 0)
    .sort((a, b) => b.royalty - a.royalty)
    .slice(0, 5)
})

const counts = computed(() => {
  const p = data.value?.prints ?? []
  return {
    total: p.length,
    pending: p.filter(x => x.moderation_status === 'pending').length,
    approved: p.filter(x => x.moderation_status === 'approved').length,
    rejected: p.filter(x => x.moderation_status === 'rejected').length,
  }
})

onMounted(() => {
  const stop = d.subscribeSales(() => refresh())
  onBeforeUnmount(stop)
})
const money = (n: number | null | undefined) => `${Math.round(Number(n) || 0).toLocaleString('ru')} ₸`
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.designer.overview.label')" :title="$t('studio.designer.overview.title', { name: data?.profile?.display_name || $t('studio.designer.overview.defaultName') })" :description="$t('studio.designer.overview.description')" />

    <div v-if="!data?.profile" class="border border-ink-warning/40 bg-ink-warning/5 rounded-lg p-4 text-caption mb-6">
      {{ $t('studio.designer.overview.notConfigured') }}
    </div>

    <div class="space-y-8">
      <!-- баланс -->
      <div class="grid sm:grid-cols-3 gap-4">
        <UiStatCard :label="$t('studio.designer.overview.totalEarned')" :value="money(data?.balance?.total_earned)" icon="i-lucide-trending-up" />
        <UiStatCard :label="$t('studio.designer.overview.available')" :value="money(data?.balance?.available)" icon="i-lucide-wallet" accent :hint="$t('studio.designer.overview.availableHint')" />
        <UiStatCard :label="$t('studio.designer.overview.royaltyRate')" :value="`${data?.profile?.royalty_pct ?? '—'}%`" icon="i-lucide-percent" />
      </div>

      <!-- счётчики принтов -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <UiStatCard :label="$t('studio.designer.overview.totalPrints')" :value="counts.total" />
        <UiStatCard :label="$t('studio.designer.overview.pending')" :value="counts.pending" />
        <UiStatCard :label="$t('studio.designer.overview.approved')" :value="counts.approved" />
        <UiStatCard :label="$t('studio.designer.overview.rejected')" :value="counts.rejected" />
      </div>

      <!-- топ принтов -->
      <UiPanel v-if="topPrints.length" :title="$t('studio.designer.overview.topPrints')" icon="i-lucide-award" :padded="false">
        <div class="divide-y divide-ink-gray-200">
          <div v-for="(p, i) in topPrints" :key="p.id" class="flex items-center justify-between gap-3 px-6 py-3 text-caption">
            <span class="flex items-center gap-2 min-w-0">
              <span class="ink-label text-ink-gray-400">#{{ i + 1 }}</span><span class="truncate">{{ p.title }}</span>
            </span>
            <span class="text-ink-gray-500 shrink-0">{{ $t('studio.designer.overview.salesCount', { count: p.sales }) }}</span>
            <span class="font-semibold text-ink-success shrink-0">{{ money(p.royalty) }}</span>
          </div>
        </div>
      </UiPanel>

      <!-- последние продажи -->
      <UiPanel :title="$t('studio.designer.overview.recentSales')" icon="i-lucide-receipt" :padded="false">
        <div v-if="!data?.earnings?.length" class="px-6 py-6 text-ink-gray-600 text-caption">
          {{ $t('studio.designer.overview.noSales') }} <NuxtLink to="/studio-designer/prints" class="text-ink-burgundy font-semibold">{{ $t('studio.designer.overview.noSalesLink') }}</NuxtLink> {{ $t('studio.designer.overview.noSalesTail') }}
        </div>
        <div v-else class="divide-y divide-ink-gray-200">
          <div v-for="e in data!.earnings" :key="e.id" class="flex items-center justify-between gap-3 px-6 py-3 text-caption">
            <span class="truncate">{{ e.print_library?.title ?? $t('studio.designer.overview.printFallback') }}</span>
            <span class="text-ink-gray-500 shrink-0">{{ new Date(e.created_at).toLocaleDateString('ru') }}</span>
            <span class="font-semibold text-ink-success shrink-0">+{{ money(e.amount) }}</span>
          </div>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
