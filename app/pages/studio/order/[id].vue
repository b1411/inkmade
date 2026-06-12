<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS, TRANSITIONS, REASON_REQUIRED } from '~~/shared/config/order-status'

// Карточка заказа для цеха (§8.3): спецификация в мм, заготовка, смена этапов.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })

const route = useRoute()
const id = route.params.id as string
const { getOrder, changeStatus, moderateDesign } = useStudio()
const toast = useToast()

const MODERATION_LABELS: Record<string, string> = {
  pending: 'На модерации',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}
const moderatingId = ref<string | null>(null)

async function moderate(designId: string | undefined, status: 'approved' | 'rejected') {
  if (!designId || moderatingId.value) return
  moderatingId.value = designId
  try {
    await moderateDesign(designId, status)
    toast.add({ title: `Дизайн: ${MODERATION_LABELS[status]}`, color: status === 'approved' ? 'success' : 'warning' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка модерации', description: (e as { data?: { message?: string } }).data?.message ?? (e as Error).message, color: 'error' })
  } finally {
    moderatingId.value = null
  }
}

const { data: order, refresh } = await useAsyncData(`studio-order-${id}`, () => getOrder(id))

const nextStates = computed<OrderStatus[]>(() => TRANSITIONS[(order.value?.status as OrderStatus) ?? 'paid'] ?? [])

// Гейт модерации (P2.14, §24) — дублируем серверную проверку в UI, чтобы оператор
// не упирался в ошибку: в печать нельзя, пока хоть один дизайн не одобрен.
const hasUnapproved = computed(() =>
  (order.value?.order_items ?? []).some(
    (it: { designs?: { moderation_status?: string } | null }) =>
      it.designs && it.designs.moderation_status !== 'approved',
  ),
)

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

// доказательная база (§6.8): фото QC/брака
const { addEvidence, listEvidence } = useStudio()
const evidence = ref<{ id: string; kind: string; note: string | null; url: string | null; created_at: string }[]>([])
const evKind = ref<'qc' | 'defect' | 'other'>('qc')
const evNote = ref('')
const evUploading = ref(false)
const evInput = ref<HTMLInputElement | null>(null)
const KIND_LABELS: Record<string, string> = { qc: 'Контроль качества', defect: 'Брак', other: 'Прочее' }

async function loadEvidence() {
  try { evidence.value = await listEvidence(id) } catch { /* не критично */ }
}
onMounted(loadEvidence)

async function onEvidencePick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  evUploading.value = true
  try {
    await addEvidence(id, file, evKind.value, evNote.value.trim() || undefined)
    evNote.value = ''
    if (evInput.value) evInput.value.value = ''
    await loadEvidence()
    toast.add({ title: 'Фото добавлено', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Ошибка загрузки', description: (err as Error).message, color: 'error' })
  } finally {
    evUploading.value = false
  }
}

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

    <!-- подарочная упаковка (§3.1): инструкция для цеха -->
    <div v-if="order.is_gift" class="mb-6 border-2 border-ink-burgundy/40 bg-ink-burgundy/5 rounded-lg p-4">
      <p class="ink-label text-ink-burgundy flex items-center gap-1.5"><UIcon name="i-lucide-gift" class="size-4" /> Подарочная упаковка</p>
      <p v-if="order.gift_recipient" class="text-caption mt-2">Получатель: <strong>{{ order.gift_recipient }}</strong></p>
      <p v-if="order.gift_message" class="text-caption mt-1">Открытка: «{{ order.gift_message }}»</p>
      <p v-if="order.gift_hide_price" class="text-caption mt-1 font-semibold text-ink-burgundy">⚠ Не вкладывать чек с ценой</p>
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

          <!-- скриншот композиции для наглядности (§5.1) -->
          <img
            v-if="it.designs?.preview_url"
            :src="it.designs.preview_url"
            :alt="`Композиция ${it.variants?.products?.title ?? ''}`"
            class="mt-3 w-40 rounded-md border border-ink-gray-200 bg-ink-gray-200/30"
            loading="lazy"
          >

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

          <!-- модерация загрузки (P2.14): без approved заказ не уйдёт в печать -->
          <div v-if="it.designs" class="mt-3 flex flex-wrap items-center gap-2">
            <UBadge
              :color="it.designs.moderation_status === 'approved' ? 'success' : it.designs.moderation_status === 'rejected' ? 'error' : 'warning'"
              variant="subtle"
            >
              {{ MODERATION_LABELS[it.designs.moderation_status] ?? it.designs.moderation_status }}
            </UBadge>
            <UButton
              v-if="it.designs.moderation_status !== 'approved'"
              size="xs" color="success" variant="subtle" icon="i-lucide-check"
              :loading="moderatingId === it.designs.id" @click="moderate(it.designs?.id, 'approved')"
            >
              Одобрить
            </UButton>
            <UButton
              v-if="it.designs.moderation_status !== 'rejected'"
              size="xs" color="error" variant="ghost" icon="i-lucide-x"
              :loading="moderatingId === it.designs.id" @click="moderate(it.designs?.id, 'rejected')"
            >
              Отклонить
            </UButton>
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
        <!-- доказательная база: фото QC/брака (§6.8) -->
        <div class="border border-ink-gray-200 rounded-lg p-4">
          <p class="ink-label text-ink-gray-600 mb-2">Фото-доказательства</p>
          <div v-if="evidence.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            <a v-for="e in evidence" :key="e.id" :href="e.url ?? '#'" target="_blank" class="block group">
              <img v-if="e.url" :src="e.url" :alt="KIND_LABELS[e.kind]" class="aspect-square w-full object-cover rounded-md border border-ink-gray-200">
              <span class="text-[10px] text-ink-gray-500 block truncate">{{ KIND_LABELS[e.kind] }}<template v-if="e.note"> · {{ e.note }}</template></span>
            </a>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <USelect v-model="evKind" :items="[{ label: 'Контроль качества', value: 'qc' }, { label: 'Брак', value: 'defect' }, { label: 'Прочее', value: 'other' }]" value-key="value" size="xs" class="w-44" />
            <UInput v-model="evNote" size="xs" placeholder="Комментарий" class="flex-1 min-w-32" />
            <input ref="evInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onEvidencePick">
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-camera" :loading="evUploading" @click="evInput?.click()">Добавить фото</UButton>
          </div>
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
          :disabled="to === 'printing' && hasUnapproved"
          @click="startTransition(to)"
        >
          {{ STATUS_LABELS[to] }}
        </UButton>
        <p v-if="hasUnapproved && nextStates.includes('printing')" class="text-caption text-ink-warning flex items-start gap-1.5">
          <UIcon name="i-lucide-alert-triangle" class="shrink-0 mt-0.5" />
          Одобрите все дизайны, чтобы отправить заказ в печать.
        </p>
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
