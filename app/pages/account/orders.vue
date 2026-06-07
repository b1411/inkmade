<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { CUSTOMER_STATUS } from '~~/shared/config/order-status'

// История заказов клиента (§8.1). RLS отдаёт только свои.
definePageMeta({ layout: 'account', middleware: 'auth' })
const supabase = useSupabaseClient<Database>()

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
const toast = useToast()
const reordering = ref<string | null>(null)
async function onReorder(orderId: string) {
  reordering.value = orderId
  try {
    const n = await reorder(orderId)
    toast.add({ title: `Добавлено в корзину: ${n}`, color: 'success' })
    await navigateTo('/cart')
  } catch (e) {
    toast.add({ title: 'Не удалось повторить', description: (e as Error).message, color: 'error' })
  } finally {
    reordering.value = null
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>Заказы</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Мои заказы</h1>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
    <div v-else-if="!orders?.length" class="py-10 text-center text-ink-gray-600">
      Заказов пока нет. <NuxtLink to="/catalog" class="text-ink-burgundy font-semibold">В каталог</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="o in orders"
        :key="o.id"
        :to="`/order/${o.id}`"
        class="flex items-center justify-between border border-ink-gray-200 rounded-lg p-4 hover:border-ink-burgundy transition-colors"
      >
        <div>
          <p class="ink-label">#{{ shortId(o.id) }}</p>
          <p class="text-caption text-ink-gray-600">{{ new Date(o.created_at).toLocaleDateString('ru') }} · {{ o.order_items?.length ?? 0 }} поз.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <UBadge :color="badge(o.status)" variant="subtle">{{ CUSTOMER_STATUS[o.status as OrderStatus] }}</UBadge>
            <p class="font-semibold mt-1">{{ o.total }} {{ o.currency }}</p>
          </div>
          <UButton
            size="xs" color="primary" variant="subtle" icon="i-lucide-repeat"
            :loading="reordering === o.id"
            @click.prevent.stop="onReorder(o.id)"
          >Повторить</UButton>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
