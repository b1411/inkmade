<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { PRODUCTION_STAGES } from '~~/shared/config/order-status'

// Очередь производства (§8.3). Доска по этапам, обновление через Realtime.
// Фаза O2: поиск, фильтр просрочки, SLA-подсветка возраста, сводные метрики.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })

const { listQueue, subscribe } = useStudio()
const { t } = useI18n()
const { data: orders, refresh, pending, error } = await useAsyncData('studio-queue', () => listQueue())

// колонки доски: новые (paid) + производственные этапы + пауза/перепечатка.
// Терминальные (shipped/delivered/cancelled) на доске не показываются — любая
// отрисованная карточка считается активной.
const COLUMNS: OrderStatus[] = ['paid', ...PRODUCTION_STAGES, 'on_hold', 'reprint']

// SLA задаётся по этапам и считается от фактического входа в текущий статус.
const STAGE_SLA_HOURS: Record<string, number> = {
  paid: 8,
  queued: 24,
  printing: 24,
  quality_check: 8,
  packing: 12,
  ready_to_ship: 12,
  on_hold: 24,
  reprint: 24,
}

const q = ref('')
const onlyOverdue = ref(false)
const mobileView = ref<'list' | 'board'>('list')

// «сейчас» инициализируем только на клиенте (onMounted) — иначе SSR-гидрация
// рассинхронится (время сервера ≠ время клиента).
const now = ref(0)

type QueueRow = NonNullable<typeof orders.value>[number]

const shortId = (id: string) => id.slice(0, 8)

function stageAgeHours(changedAt: string): number | null {
  if (!now.value) return null
  return Math.max(0, Math.floor((now.value - new Date(changedAt).getTime()) / 3_600_000))
}
function stageAgeLabel(o: QueueRow): string {
  const hours = stageAgeHours(o.status_changed_at)
  if (hours == null) return ''
  return hours < 24
    ? t('studio.production.stageAgeHours', { n: hours })
    : t('studio.production.stageAgeDays', { n: Math.floor(hours / 24) })
}
function isOverdue(o: QueueRow): boolean {
  const age = stageAgeHours(o.status_changed_at)
  return age != null && age >= (STAGE_SLA_HOURS[o.status] ?? 24)
}
function matchesQuery(o: QueueRow): boolean {
  const term = q.value.trim().toLowerCase()
  if (!term) return true
  return shortId(o.id).toLowerCase().includes(term)
    || (o.customer_name ?? '').toLowerCase().includes(term)
}

const visible = computed<QueueRow[]>(() =>
  (orders.value ?? []).filter(o => matchesQuery(o) && (!onlyOverdue.value || isOverdue(o))),
)
const byStatus = (s: OrderStatus) => visible.value.filter(o => o.status === s)

// сводные метрики по активной доске (статусы из COLUMNS)
const activeOrders = computed(() => (orders.value ?? []).filter(o => (COLUMNS as string[]).includes(o.status)))
const onBoard = computed(() => visible.value.filter(o => (COLUMNS as string[]).includes(o.status)))
const overdueCount = computed(() => onBoard.value.filter(isOverdue).length)
const oldestAge = computed(() => {
  const ages = onBoard.value.map(o => stageAgeHours(o.status_changed_at)).filter((a): a is number => a != null)
  const hours = ages.length ? Math.max(...ages) : 0
  return hours < 24
    ? t('studio.production.stageAgeHours', { n: hours })
    : t('studio.production.stageAgeDays', { n: Math.floor(hours / 24) })
})
const priorityOrders = computed(() => [...onBoard.value].sort((a, b) => {
  const overdueDelta = Number(isOverdue(b)) - Number(isOverdue(a))
  if (overdueDelta) return overdueDelta
  return (stageAgeHours(b.status_changed_at) ?? 0) - (stageAgeHours(a.status_changed_at) ?? 0)
}))

let unsub: (() => void) | undefined
onMounted(() => {
  now.value = Date.now()
  unsub = subscribe(() => refresh())
})
onUnmounted(() => unsub?.())
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.production.label')" :title="$t('studio.production.title')" :description="$t('studio.production.description')">
      <template #actions>
        <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()">{{ $t('studio.production.refresh') }}</UButton>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="space-y-5">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <UiSkeleton v-for="n in 3" :key="n" rounded="rounded-lg" class="h-24" />
      </div>
      <div class="flex gap-4 overflow-hidden">
        <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-64 w-64 shrink-0" />
      </div>
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="i-lucide-cloud-off"
      :title="$t('studio.production.loadErrorTitle')"
      :text="$t('studio.production.loadErrorText')"
    >
      <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="() => refresh()">{{ $t('states.retry') }}</UButton>
    </UiEmptyState>

    <template v-else>
      <!-- сводные метрики -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <UiStatCard :label="$t('studio.production.stats.onBoard')" :value="activeOrders.length" icon="i-lucide-layers" />
        <UiStatCard :label="$t('studio.production.stats.overdue')" :value="overdueCount" icon="i-lucide-alarm-clock" :accent="overdueCount > 0" :hint="$t('studio.production.stats.slaHint')" />
        <UiStatCard :label="$t('studio.production.stats.oldest')" :value="oldestAge" icon="i-lucide-hourglass" :hint="$t('studio.production.stats.oldestHint')" />
      </div>

      <!-- поиск + фильтр просрочки -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <UInput v-model="q" icon="i-lucide-search" :placeholder="$t('studio.production.filters.search')" :aria-label="$t('studio.production.filters.searchLabel')" class="w-full sm:w-72" />
        <UCheckbox v-model="onlyOverdue" :label="$t('studio.production.filters.onlyOverdue')" />
        <div class="ml-auto flex sm:hidden" role="group" :aria-label="$t('studio.production.view.label')">
          <UButton size="xs" :variant="mobileView === 'list' ? 'solid' : 'ghost'" color="neutral" icon="i-lucide-list" @click="mobileView = 'list'">{{ $t('studio.production.view.list') }}</UButton>
          <UButton size="xs" :variant="mobileView === 'board' ? 'solid' : 'ghost'" color="neutral" icon="i-lucide-columns-3" @click="mobileView = 'board'">{{ $t('studio.production.view.board') }}</UButton>
        </div>
      </div>

      <UiEmptyState v-if="!activeOrders.length" icon="i-lucide-circle-check-big" :title="$t('studio.production.noActiveTitle')" :text="$t('studio.production.noActiveText')" />
      <UiEmptyState v-else-if="!onBoard.length" compact icon="i-lucide-search-x" :title="$t('studio.production.noMatches')" />

      <!-- На телефоне по умолчанию показываем приоритетный список. -->
      <template v-else>
        <div v-if="mobileView === 'list'" class="space-y-2 sm:hidden">
          <NuxtLink
            v-for="o in priorityOrders"
            :key="o.id"
            :to="`/studio/order/${o.id}`"
            class="block rounded-lg border bg-ink-white p-4 transition-all hover:border-ink-burgundy"
            :class="isOverdue(o) ? 'border-ink-error/60' : 'border-ink-gray-200'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ink-label">#{{ shortId(o.id) }}</span>
                  <UBadge color="neutral" variant="subtle" size="xs">{{ $t(`domain.orderStatus.${o.status}`) }}</UBadge>
                </div>
                <p v-if="o.customer_name" class="mt-2 truncate text-caption font-medium text-ink-black">{{ o.customer_name }}</p>
                <p class="mt-1 text-caption text-ink-gray-600">{{ $t('studio.production.positions', { count: o.item_count ?? 0 }) }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p :class="isOverdue(o) ? 'font-semibold text-ink-error' : 'text-ink-gray-500'" class="text-caption">{{ stageAgeLabel(o) }}</p>
                <p class="mt-1 text-[11px] text-ink-gray-400">{{ $t('studio.production.slaThreshold', { n: STAGE_SLA_HOURS[o.status] ?? 24 }) }}</p>
              </div>
            </div>
          </NuxtLink>
        </div>

        <div class="gap-4 overflow-x-auto pb-4" :class="mobileView === 'list' ? 'hidden sm:flex' : 'flex'">
      <div v-for="col in COLUMNS" :key="col" class="shrink-0 w-64">
        <div class="ink-label text-ink-gray-600 mb-2 flex items-center justify-between">
          <span>{{ $t(`domain.orderStatus.${col}`) }}</span>
          <span class="text-ink-gray-400">{{ byStatus(col).length }}</span>
        </div>
        <div class="space-y-2">
          <NuxtLink
            v-for="o in byStatus(col)"
            :key="o.id"
            :to="`/studio/order/${o.id}`"
            class="block border rounded-md p-3 hover:border-ink-burgundy hover:shadow-sm transition-all bg-ink-white"
            :class="isOverdue(o) ? 'border-ink-error/60' : 'border-ink-gray-200'"
          >
            <div class="flex justify-between items-center gap-2">
              <span class="ink-label">#{{ shortId(o.id) }}</span>
              <span
                v-if="stageAgeHours(o.status_changed_at) != null"
                class="text-xs px-1.5 py-0.5 rounded shrink-0"
                :class="isOverdue(o) ? 'bg-ink-error/10 text-ink-error font-semibold' : 'text-ink-gray-400'"
              >
                {{ stageAgeLabel(o) }}
              </span>
            </div>
            <p v-if="o.customer_name" class="text-caption font-medium text-ink-black mt-1 truncate">{{ o.customer_name }}</p>
            <p class="text-caption text-ink-gray-600 mt-1">{{ $t('studio.production.positions', { count: o.item_count ?? 0 }) }}</p>
          </NuxtLink>
          <p v-if="!byStatus(col).length" class="text-caption text-ink-gray-400 px-1">{{ $t('studio.production.empty') }}</p>
        </div>
        </div>
        </div>
      </template>
    </template>
  </div>
</template>
