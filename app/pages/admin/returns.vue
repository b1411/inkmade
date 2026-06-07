<script setup lang="ts">
// Возвраты и рекламации (CRM §6.8): заказы с проблемами + решение reprint/refunded.
// Доказательная база — скриншот композиции + спецификация (в карточке заказа /admin/orders/[id]).
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
import type { Database } from '~/types/database.types'
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS } from '~~/shared/config/order-status'
const supabase = useSupabaseClient<Database>()
const { changeStatus } = useStudio()
const { refundOrder } = useFinance()
const toast = useToast()

const PROBLEM = ['on_hold', 'reprint', 'refunded', 'cancelled']
const { data: orders, refresh, pending } = await useAsyncData('admin-returns', async () => {
  const { data } = await supabase
    .from('orders')
    .select('id, status, total, currency, created_at')
    .in('status', PROBLEM)
    .order('created_at', { ascending: false })
  return data
})

const busy = ref<string | null>(null)
async function act(orderId: string, to: OrderStatus) {
  const note = window.prompt(`Причина перехода в «${STATUS_LABELS[to]}»:`) ?? ''
  if (!note) return
  busy.value = orderId
  try {
    // возврат идёт через refund_order: статус + реверс роялти + леджер (§7.3)
    if (to === 'refunded') await refundOrder(orderId, note)
    else await changeStatus(orderId, to, { note })
    await refresh()
    toast.add({ title: `Статус: ${STATUS_LABELS[to]}`, color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as { data?: { message?: string } }).data?.message ?? (e as Error).message, color: 'error' })
  } finally { busy.value = null }
}
const shortId = (s: string) => s.slice(0, 8)
const badge = (s: string) => s === 'refunded' || s === 'cancelled' ? 'error' : 'warning'
</script>

<template>
  <div class="space-y-6">
    <div>
      <UiSectionLabel accent>Сервис</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Возвраты и рекламации</h1>
      <p class="text-caption text-ink-gray-600 mt-1">Персонализация снимает возврат «по капризу», но не снимает ответственность за брак.</p>
    </div>

    <div v-if="pending" class="py-6 text-ink-gray-600">Загрузка…</div>
    <div v-else-if="!orders?.length" class="py-6 text-ink-gray-600 text-caption">Проблемных заказов нет.</div>
    <div v-else class="space-y-3">
      <div v-for="o in orders" :key="o.id" class="flex items-center justify-between border border-ink-gray-200 rounded-lg p-4">
        <div>
          <NuxtLink :to="`/admin/orders/${o.id}`" class="ink-label text-ink-burgundy">#{{ shortId(o.id) }}</NuxtLink>
          <p class="text-caption text-ink-gray-600">{{ new Date(o.created_at).toLocaleDateString('ru') }} · {{ o.total }} {{ o.currency }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :color="badge(o.status)" variant="subtle">{{ STATUS_LABELS[o.status as OrderStatus] }}</UBadge>
          <UButton v-if="o.status === 'on_hold'" size="xs" color="warning" variant="subtle" :loading="busy === o.id" @click="act(o.id, 'reprint')">Переделать</UButton>
          <UButton v-if="['on_hold', 'reprint'].includes(o.status)" size="xs" color="error" variant="ghost" :loading="busy === o.id" @click="act(o.id, 'refunded')">Возврат</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
