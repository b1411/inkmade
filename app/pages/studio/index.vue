<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { PRODUCTION_STAGES } from '~~/shared/config/order-status'

// Очередь производства (§8.3). Доска по этапам, обновление через Realtime.
definePageMeta({ layout: 'studio', middleware: 'studio-role' })

const { listQueue, subscribe } = useStudio()
const { data: orders, refresh } = await useAsyncData('studio-queue', () => listQueue())

// колонки доски: новые (paid) + производственные этапы + пауза
const COLUMNS: OrderStatus[] = ['paid', ...PRODUCTION_STAGES, 'on_hold', 'reprint']

const byStatus = (s: OrderStatus) => (orders.value ?? []).filter(o => o.status === s)

let unsub: (() => void) | undefined
onMounted(() => { unsub = subscribe(() => refresh()) })
onUnmounted(() => unsub?.())

const shortId = (id: string) => id.slice(0, 8)
</script>

<template>
  <div>
    <UiPageHeader :label="$t('studio.production.label')" :title="$t('studio.production.title')" :description="$t('studio.production.description')">
      <template #actions>
        <UButton color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="refresh()">{{ $t('studio.production.refresh') }}</UButton>
      </template>
    </UiPageHeader>

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
            class="block border border-ink-gray-200 rounded-md p-3 hover:border-ink-burgundy hover:shadow-sm transition-all bg-ink-white"
          >
            <div class="flex justify-between items-center">
              <span class="ink-label">#{{ shortId(o.id) }}</span>
              <span class="text-caption text-ink-gray-400">{{ new Date(o.created_at).toLocaleDateString('ru') }}</span>
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
