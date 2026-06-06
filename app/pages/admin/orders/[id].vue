<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS, TRANSITIONS, REASON_REQUIRED } from '~~/shared/config/order-status'

// Карточка заказа в админке (§8.2.3): позиции, адрес, оплата, лог, ручное управление.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })

const route = useRoute()
const id = route.params.id as string
const { getOrder, changeStatus } = useStudio()
const toast = useToast()

const { data: order, refresh } = await useAsyncData(`admin-order-${id}`, () => getOrder(id))

const nextStates = computed<OrderStatus[]>(() => TRANSITIONS[(order.value?.status as OrderStatus) ?? 'paid'] ?? [])
const modal = reactive({ open: false, to: '' as OrderStatus, note: '', trackingNo: '', carrier: '' })
const busy = ref(false)

function start(to: OrderStatus) {
  if (to === 'shipped' || REASON_REQUIRED.includes(to)) Object.assign(modal, { open: true, to, note: '', trackingNo: '', carrier: '' })
  else perform(to)
}
async function perform(to: OrderStatus, opts?: { note?: string; trackingNo?: string; carrier?: string }) {
  busy.value = true
  try {
    await changeStatus(id, to, opts)
    toast.add({ title: `Статус: ${STATUS_LABELS[to]}`, color: 'success' })
    modal.open = false
    await refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as { data?: { message?: string } }).data?.message ?? (e as Error).message, color: 'error' })
  } finally { busy.value = false }
}

const addr = computed(() => order.value?.shipping_addr as Record<string, string> | null)
const shortId = (s: string) => s.slice(0, 8)
</script>

<template>
  <div v-if="order">
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Заказ #{{ shortId(order.id) }}</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-1">{{ STATUS_LABELS[order.status as OrderStatus] }}</h1>
      </div>
      <UButton to="/admin/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">К списку</UButton>
    </div>

    <div class="grid lg:grid-cols-[1fr_300px] gap-8">
      <div class="space-y-4">
        <!-- позиции -->
        <div v-for="it in order.order_items" :key="it.id" class="border border-ink-gray-200 rounded-lg p-4">
          <p class="font-semibold">{{ it.variants?.products?.title }} · {{ it.variants?.color_name }}/{{ it.variants?.size }} ×{{ it.quantity }}</p>
          <p class="text-caption text-ink-gray-600">{{ it.unit_price }} ₸ · {{ it.print_method }}</p>
        </div>

        <!-- адрес + оплата -->
        <div class="border border-ink-gray-200 rounded-lg p-4 text-caption space-y-1">
          <p class="ink-label text-ink-gray-600">Доставка</p>
          <p v-if="addr">{{ addr.full_name }}, {{ addr.phone }} — {{ addr.city }}, {{ addr.address }}</p>
          <p v-if="order.tracking_no">Трек: {{ order.tracking_no }} ({{ order.carrier }})</p>
          <p>Оплата: {{ order.paid_at ? new Date(order.paid_at).toLocaleString('ru') : 'не оплачен' }}</p>
        </div>

        <!-- лог -->
        <div class="border border-ink-gray-200 rounded-lg p-4">
          <p class="ink-label text-ink-gray-600 mb-2">Лог статусов</p>
          <ul class="space-y-1 text-caption">
            <li v-for="l in (order.order_status_log ?? []).slice().reverse()" :key="l.id" class="flex gap-2">
              <span class="text-ink-gray-400">{{ new Date(l.created_at).toLocaleString('ru') }}</span>
              <span>{{ l.from_status }} → <strong>{{ l.to_status }}</strong></span>
              <span v-if="l.note" class="text-ink-gray-600">— {{ l.note }}</span>
            </li>
          </ul>
        </div>
      </div>

      <aside class="border border-ink-gray-200 rounded-lg p-4 h-fit space-y-3">
        <UiSectionLabel accent>Управление</UiSectionLabel>
        <UButton
          v-for="to in nextStates"
          :key="to"
          :color="['reprint','cancelled','refunded'].includes(to) ? 'error' : to === 'on_hold' ? 'warning' : 'primary'"
          variant="subtle" block :loading="busy"
          @click="start(to)"
        >{{ STATUS_LABELS[to] }}</UButton>
        <p v-if="!nextStates.length" class="text-caption text-ink-gray-400">Конечный статус.</p>
      </aside>
    </div>

    <UModal v-model:open="modal.open" :title="STATUS_LABELS[modal.to]">
      <template #body>
        <div class="space-y-4">
          <template v-if="modal.to === 'shipped'">
            <UFormField label="Трек-номер" required><UInput v-model="modal.trackingNo" class="w-full" /></UFormField>
            <UFormField label="Перевозчик" required><UInput v-model="modal.carrier" class="w-full" /></UFormField>
          </template>
          <UFormField v-else label="Причина" required><UTextarea v-model="modal.note" :rows="3" class="w-full" /></UFormField>
          <UButton color="primary" block :loading="busy" @click="perform(modal.to, { note: modal.note, trackingNo: modal.trackingNo, carrier: modal.carrier })">Подтвердить</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
