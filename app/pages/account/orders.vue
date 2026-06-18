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

// повтор заказа в один клик из списка (CRM §3.2)
const { reorder } = useOrder()
const notify = useNotify()
const reordering = ref<string | null>(null)
async function onReorder(orderId: string) {
  reordering.value = orderId
  try {
    const n = await reorder(orderId)
    notify.success(t('account.orders.reorderSuccess', { count: n }))
    await navigateTo('/cart')
  } catch (e) {
    notify.error(t('account.orders.reorderErrorTitle'), (e as Error).message)
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

    <div v-else class="space-y-3">
      <UiAppCard v-for="o in orders" :key="o.id" :to="`/order/${o.id}`" hover>
        <div class="flex items-center justify-between p-4">
          <div>
            <p class="ink-label">#{{ shortId(o.id) }}</p>
            <p class="text-caption text-ink-gray-600">{{ new Date(o.created_at).toLocaleDateString('ru') }} · {{ o.order_items?.length ?? 0 }} {{ $t('account.orders.itemsShort') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <UBadge :color="badge(o.status)" variant="subtle">{{ $t(`domain.customerStatus.${o.status}`) }}</UBadge>
              <p class="font-semibold mt-1">{{ o.total }} {{ o.currency }}</p>
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
  </div>
</template>
