<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { PRODUCTION_STAGES } from '~~/shared/config/order-status'

// Очередь производства (§8.3). Доска по этапам, обновление через Realtime.
// Фаза O2: поиск, фильтр просрочки, SLA-подсветка возраста, сводные метрики.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })

const { listQueue, subscribe } = useStudio()
const { data: orders, refresh } = await useAsyncData('studio-queue', () => listQueue())

// колонки доски: новые (paid) + производственные этапы + пауза/перепечатка.
// Терминальные (shipped/delivered/cancelled) на доске не показываются — любая
// отрисованная карточка считается активной.
const COLUMNS: OrderStatus[] = ['paid', ...PRODUCTION_STAGES, 'on_hold', 'reprint']

// SLA: порог возраста заказа (дни), после которого карточка — просроченная.
// Возраст считаем от created_at (первое приближение; «время в текущей стадии» — позже).
const SLA_DAYS = 3

const q = ref('')
const onlyOverdue = ref(false)

// «сейчас» инициализируем только на клиенте (onMounted) — иначе SSR-гидрация
// рассинхронится (время сервера ≠ время клиента).
const now = ref(0)

type QueueRow = NonNullable<typeof orders.value>[number]

const shortId = (id: string) => id.slice(0, 8)

function ageDays(createdAt: string): number | null {
  if (!now.value) return null
  return Math.floor((now.value - new Date(createdAt).getTime()) / 86_400_000)
}
function isOverdue(o: QueueRow): boolean {
  const a = ageDays(o.created_at)
  return a != null && a >= SLA_DAYS
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
const onBoard = computed(() => visible.value.filter(o => (COLUMNS as string[]).includes(o.status)))
const overdueCount = computed(() => onBoard.value.filter(isOverdue).length)
const oldestAge = computed(() => {
  const ages = onBoard.value.map(o => ageDays(o.created_at)).filter((a): a is number => a != null)
  return ages.length ? Math.max(...ages) : 0
})

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
        <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="refresh()">{{ $t('studio.production.refresh') }}</UButton>
      </template>
    </UiPageHeader>

    <!-- сводные метрики -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
      <UiStatCard :label="$t('studio.production.stats.onBoard')" :value="onBoard.length" icon="i-lucide-layers" />
      <UiStatCard :label="$t('studio.production.stats.overdue')" :value="overdueCount" icon="i-lucide-alarm-clock" :accent="overdueCount > 0" :hint="$t('studio.production.stats.slaHint', { days: SLA_DAYS })" />
      <UiStatCard :label="$t('studio.production.stats.oldest')" :value="oldestAge" icon="i-lucide-hourglass" :hint="$t('studio.production.stats.oldestHint')" />
    </div>

    <!-- поиск + фильтр просрочки -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="q" icon="i-lucide-search" :placeholder="$t('studio.production.filters.search')" class="w-full sm:w-72" />
      <UCheckbox v-model="onlyOverdue" :label="$t('studio.production.filters.onlyOverdue')" />
    </div>

    <div class="flex gap-4 overflow-x-auto pb-4">
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
                v-if="ageDays(o.created_at) != null"
                class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                :class="isOverdue(o) ? 'bg-ink-error/10 text-ink-error font-semibold' : 'text-ink-gray-400'"
              >
                {{ $t('studio.production.age', { n: ageDays(o.created_at) }) }}
              </span>
            </div>
            <p v-if="o.customer_name" class="text-caption font-medium text-ink-black mt-1 truncate">{{ o.customer_name }}</p>
            <p class="text-caption text-ink-gray-600 mt-1">{{ $t('studio.production.positions', { count: o.item_count ?? 0 }) }}</p>
          </NuxtLink>
          <p v-if="!byStatus(col).length" class="text-caption text-ink-gray-400 px-1">{{ $t('studio.production.empty') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
