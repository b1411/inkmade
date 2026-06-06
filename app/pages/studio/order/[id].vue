<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS, TRANSITIONS, REASON_REQUIRED } from '~~/shared/config/order-status'

// Карточка заказа для цеха (§8.3): спецификация в мм, заготовка, смена этапов.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })

const route = useRoute()
const id = route.params.id as string
const { getOrder, changeStatus } = useStudio()
const toast = useToast()

const { data: order, refresh } = await useAsyncData(`studio-order-${id}`, () => getOrder(id))

const nextStates = computed<OrderStatus[]>(() => TRANSITIONS[(order.value?.status as OrderStatus) ?? 'paid'] ?? [])

// модал действия (причина / трек)
const modal = reactive({ open: false, to: '' as OrderStatus, note: '', trackingNo: '', carrier: '' })
const busy = ref(false)

function startTransition(to: OrderStatus) {
  if (to === 'shipped' || REASON_REQUIRED.includes(to)) {
    Object.assign(modal, { open: true, to, note: '', trackingNo: '', carrier: '' })
  } else {
    perform(to)
  }
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
  } finally {
    busy.value = false
  }
}

function confirmModal() {
  perform(modal.to, { note: modal.note, trackingNo: modal.trackingNo, carrier: modal.carrier })
}

const shortId = (s: string) => s.slice(0, 8)
function specPlacements(item: { designs?: { spec?: unknown } | null }) {
  const spec = item.designs?.spec as { placements?: Record<string, unknown>[] } | undefined
  return spec?.placements ?? []
}
</script>

<template>
  <div v-if="order">
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Заказ #{{ shortId(order.id) }}</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-1">{{ STATUS_LABELS[order.status as OrderStatus] }}</h1>
      </div>
      <UButton to="/studio" color="neutral" variant="ghost" icon="i-lucide-arrow-left">К очереди</UButton>
    </div>

    <div class="grid lg:grid-cols-[1fr_300px] gap-8">
      <!-- позиции -->
      <div class="space-y-4">
        <div v-for="(it, idx) in order.order_items" :key="it.id" class="border border-ink-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <p class="font-semibold">{{ it.variants?.products?.title }} · {{ it.variants?.color_name }}/{{ it.variants?.size }}</p>
            <span class="ink-label text-ink-gray-400">×{{ it.quantity }}</span>
          </div>
          <p class="text-caption text-ink-gray-600 mt-1">
            {{ it.variants?.materials?.name }} · {{ it.variants?.materials?.print_method }} / {{ it.variants?.materials?.print_mode }} · SKU {{ it.variants?.sku }}
          </p>

          <!-- спецификация нанесения в мм (§5.2) -->
          <div class="mt-3 bg-ink-gray-200/40 rounded-md p-3">
            <p class="ink-label text-ink-gray-600 mb-1">Спецификация нанесения</p>
            <div v-for="(p, i) in specPlacements(it)" :key="i" class="text-caption font-mono">
              зона {{ p.zone }}: {{ p.width_mm }}×{{ p.height_mm }} мм @ ({{ p.x_mm }}, {{ p.y_mm }}) ∠{{ p.rotation_deg }}°
              <span v-if="p.text"> — текст «{{ p.text }}»</span>
            </div>
            <p v-if="!specPlacements(it).length" class="text-caption text-ink-gray-400">нет данных</p>
            <a v-if="it.designs?.original_url" :href="it.designs.original_url" target="_blank" class="text-caption text-ink-burgundy inline-flex items-center gap-1 mt-2">
              <UIcon name="i-lucide-download" class="size-3" /> Оригинал
            </a>
          </div>
        </div>

        <!-- лог статусов -->
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

      <!-- действия -->
      <aside class="border border-ink-gray-200 rounded-lg p-4 h-fit space-y-3">
        <UiSectionLabel accent>Сменить этап</UiSectionLabel>
        <div v-if="order.tracking_no" class="text-caption text-ink-gray-600">
          Трек: {{ order.tracking_no }} ({{ order.carrier }})
        </div>
        <UButton
          v-for="to in nextStates"
          :key="to"
          :color="to === 'reprint' || to === 'cancelled' ? 'error' : to === 'on_hold' ? 'warning' : 'primary'"
          variant="subtle"
          block
          :loading="busy"
          @click="startTransition(to)"
        >
          {{ STATUS_LABELS[to] }}
        </UButton>
        <p v-if="!nextStates.length" class="text-caption text-ink-gray-400">Конечный статус.</p>
      </aside>
    </div>

    <!-- модал причины / трека -->
    <UModal v-model:open="modal.open" :title="STATUS_LABELS[modal.to]">
      <template #body>
        <div class="space-y-4">
          <template v-if="modal.to === 'shipped'">
            <UFormField label="Трек-номер" required>
              <UInput v-model="modal.trackingNo" class="w-full" />
            </UFormField>
            <UFormField label="Перевозчик" required>
              <UInput v-model="modal.carrier" placeholder="Kazpost / CDEK / курьер" class="w-full" />
            </UFormField>
          </template>
          <UFormField v-else label="Причина" required>
            <UTextarea v-model="modal.note" :rows="3" class="w-full" placeholder="Опишите причину" />
          </UFormField>
          <UButton color="primary" block :loading="busy" @click="confirmModal">Подтвердить</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
