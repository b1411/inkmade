<script setup lang="ts">
// Карточка дизайнера (CRM §6.3): профиль, принты, начисления, ставка с историей.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const route = useRoute()
const id = route.params.id as string
const { t } = useI18n()
const fin = useFinance()
const supabase = useSupabaseClient()
const toast = useToast()

const { data, refresh } = await useAsyncData(`admin-designer-${id}`, async () => {
  const [{ data: profile }, balance, earnings, prints, rates] = await Promise.all([
    supabase.from('designer_profiles').select('*').eq('id', id).maybeSingle(),
    fin.balanceOf(id), fin.earningsOf(id), fin.printsOf(id), fin.rateHistoryOf(id),
  ])
  return { profile, balance, earnings, prints, rates }
})

const money = (n: number | null | undefined) => `${Math.round(Number(n) || 0).toLocaleString('ru')} ₸`
const newRate = ref<number>(0)
watchEffect(() => { newRate.value = Number(data.value?.profile?.royalty_pct ?? 10) })

const savingRate = ref(false)
async function saveRate() {
  savingRate.value = true
  try {
    await fin.setRate(id, newRate.value)
    await refresh()
    toast.add({ title: t('admin.designers.rateUpdated', { rate: newRate.value }), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.designers.error'), description: getFetchMessage(e), color: 'error' })
  } finally { savingRate.value = false }
}
</script>

<template>
  <div v-if="data?.profile" class="space-y-8">
    <UiPageHeader :label="$t('admin.designers.detailLabel')" :title="data.profile.display_name || $t('admin.designers.noName')">
      <template #actions>
        <UButton to="/admin/designers" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('admin.designers.toList') }}</UButton>
      </template>
    </UiPageHeader>

    <div class="grid sm:grid-cols-3 gap-4">
      <UiStatCard :label="$t('admin.designers.statEarned')" :value="money(data.balance?.total_earned)" icon="i-lucide-wallet" />
      <UiStatCard :label="$t('admin.designers.statPaid')" :value="money(data.balance?.total_paid)" icon="i-lucide-check-check" />
      <UiStatCard :label="$t('admin.designers.statToPay')" :value="money(data.balance?.available)" icon="i-lucide-banknote" accent />
    </div>

    <!-- ставка роялти -->
    <UiPanel :title="$t('admin.designers.royaltyRateTitle')" class="max-w-md">
      <div class="flex items-end gap-2">
        <UFormField label="%" class="flex-1"><UInput v-model.number="newRate" type="number" min="0" max="100" class="w-full" /></UFormField>
        <UButton color="primary" :loading="savingRate" @click="saveRate">{{ $t('actions.save') }}</UButton>
      </div>
      <p class="text-caption text-ink-gray-500 mt-2">{{ $t('admin.designers.taxStatus', { status: data.profile.tax_status }) }}</p>
      <div v-if="data.rates?.length" class="mt-2 text-caption text-ink-gray-500 space-y-0.5">
        <p v-for="r in data.rates" :key="r.id">{{ new Date(r.changed_at).toLocaleDateString('ru') }}: {{ r.old_pct ?? '—' }}% → {{ r.new_pct }}%</p>
      </div>
    </UiPanel>

    <!-- принты -->
    <UiPanel :title="$t('admin.designers.printsTitle', { count: data.prints?.length ?? 0 })">
      <UiEmptyState v-if="!data.prints?.length" icon="i-lucide-image" :title="$t('admin.designers.printsEmptyTitle')" />
      <div v-else class="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div v-for="p in data.prints" :key="p.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
          <div class="aspect-square bg-ink-gray-200"><img v-if="p.thumbnail_url" :src="p.thumbnail_url" :alt="p.title" class="w-full h-full object-contain"></div>
          <p class="p-1.5 text-caption truncate">{{ p.title }}</p>
        </div>
      </div>
    </UiPanel>

    <!-- начисления -->
    <UiPanel :title="$t('admin.designers.earningsTitle')" :padded="false">
      <UiEmptyState v-if="!data.earnings?.length" icon="i-lucide-coins" :title="$t('admin.designers.earningsEmptyTitle')" />
      <div v-else class="divide-y divide-ink-gray-200 text-caption">
        <div v-for="e in data.earnings" :key="e.id" class="flex items-center justify-between px-6 py-3">
          <span>{{ e.print_library?.title ?? $t('admin.designers.printFallback') }}</span>
          <span class="text-ink-gray-500">{{ e.rate_pct }}% · {{ e.status }}</span>
          <span class="font-semibold text-ink-success">+{{ money(e.amount) }}</span>
        </div>
      </div>
    </UiPanel>
  </div>
  <UiEmptyState v-else icon="i-lucide-user-x" :title="$t('admin.designers.notFound')" />
</template>
