<script setup lang="ts">
import type { Database } from '~/types/database.types'

// История заказов клиента (§8.1). RLS отдаёт только свои.
definePageMeta({ layout: 'account', middleware: 'auth' })
const supabase = useSupabaseClient<Database>()
const { t } = useI18n()

const { data: orders, pending } = await useAsyncData('account-orders', async () => {
  const { data } = await supabase
    .from('orders')
    .select('id, status, total, currency, created_at, order_items(id)')
    .order('created_at', { ascending: false })
  return data
})

const badge = (s: string) => s === 'delivered' ? 'success' : s === 'cancelled' || s === 'refunded' ? 'error' : 'neutral'
const shortId = (s: string) => s.slice(0, 8)
const { date, money } = useFormat()

// поиск + фильтр статуса + пагинация (Фаза C3b). Свои заказы (RLS) — небольшой набор,
// фильтруем на клиенте над загруженным списком, показываем порциями по PAGE.
const q = ref('')
const statusFilter = ref<'all' | 'active' | 'delivered' | 'cancelled'>('all')
const statusItems = computed(() => [
  { label: t('account.orders.filter.all'), value: 'all' },
  { label: t('account.orders.filter.active'), value: 'active' },
  { label: t('account.orders.filter.delivered'), value: 'delivered' },
  { label: t('account.orders.filter.cancelled'), value: 'cancelled' },
])
const PAGE = 10
const shown = ref(PAGE)
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (orders.value ?? []).filter((o) => {
    if (term && !shortId(o.id).toLowerCase().includes(term)) return false
    if (statusFilter.value === 'delivered') return o.status === 'delivered'
    if (statusFilter.value === 'cancelled') return o.status === 'cancelled' || o.status === 'refunded'
    if (statusFilter.value === 'active') return !['delivered', 'cancelled', 'refunded'].includes(o.status)
    return true
  })
})
const visible = computed(() => filtered.value.slice(0, shown.value))
watch([q, statusFilter], () => { shown.value = PAGE })

// повтор заказа в один клик из списка (CRM §3.2)
const { reorder } = useOrder()
const notify = useNotify()
const reordering = ref<string | null>(null)
async function onReorder(orderId: string) {
  reordering.value = orderId
  try {
    // reorder возвращает { added, skipped } — снятые с продажи/распроданные пропускаются
    const { added, skipped } = await reorder(orderId)
    if (added === 0) {
      notify.error(t('account.orders.reorderNone'))
      return
    }
    if (skipped > 0) notify.success(t('account.orders.reorderPartial', { added, skipped }))
    else notify.success(t('account.orders.reorderSuccess', { count: added }))
    await navigateTo('/cart')
  } catch (e) {
    notify.error(t('account.orders.reorderErrorTitle'), getFetchMessage(e))
  } finally {
    reordering.value = null
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('account.orders.label')" :title="$t('account.orders.title')" :description="$t('account.orders.description')" />

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-20" />
    </div>

    <UiEmptyState
      v-else-if="!orders?.length"
      icon="i-lucide-package"
      :title="$t('account.orders.emptyTitle')"
      :text="$t('account.orders.emptyText')"
    >
      <UiAppButton to="/catalog" variant="primary" size="md">{{ $t('account.orders.toCatalog') }}</UiAppButton>
    </UiEmptyState>

    <div v-else>
      <!-- поиск + фильтр статуса (Фаза C3b) -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <UInput v-model="q" icon="i-lucide-search" :placeholder="$t('account.orders.searchPlaceholder')" class="w-full sm:w-64" />
        <USelect v-model="statusFilter" :items="statusItems" value-key="value" class="w-44" />
      </div>

      <div v-if="!filtered.length" class="py-10 text-center text-ink-gray-400 text-caption">{{ $t('account.orders.noMatches') }}</div>

      <div v-else class="space-y-3">
        <UiAppCard v-for="o in visible" :key="o.id" :to="`/order/${o.id}`" hover>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="ink-label">#{{ shortId(o.id) }}</p>
              <p class="text-caption text-ink-gray-600">{{ date(o.created_at) }} · {{ o.order_items?.length ?? 0 }} {{ $t('account.orders.itemsShort') }}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <UBadge :color="badge(o.status)" variant="subtle">{{ $t(`domain.customerStatus.${o.status}`) }}</UBadge>
                <p class="font-semibold mt-1">{{ money(o.total, o.currency) }}</p>
              </div>
              <UButton
                size="xs" color="primary" variant="subtle" icon="i-lucide-repeat"
                :loading="reordering === o.id"
                @click.prevent.stop="onReorder(o.id)"
              >{{ $t('account.orders.repeat') }}</UButton>
            </div>
          </div>
        </UiAppCard>
      </div>

      <div v-if="filtered.length > shown" class="mt-4 flex justify-center">
        <UButton color="neutral" variant="subtle" icon="i-lucide-chevron-down" @click="shown += PAGE">{{ $t('account.orders.loadMore') }}</UButton>
      </div>
    </div>
  </div>
</template>
