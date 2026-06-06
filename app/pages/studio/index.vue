<script setup lang="ts">
import type { OrderStatus } from '~~/shared/config/order-status'
import { STATUS_LABELS, PRODUCTION_STAGES } from '~~/shared/config/order-status'

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
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Очередь</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-1">Производство</h1>
      </div>
      <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" @click="refresh()">Обновить</UButton>
    </div>

    <div class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="col in COLUMNS" :key="col" class="shrink-0 w-64">
        <div class="ink-label text-ink-gray-600 mb-2 flex items-center justify-between">
          <span>{{ STATUS_LABELS[col] }}</span>
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
              <span class="text-caption font-semibold">{{ o.total }} ₸</span>
            </div>
            <p class="text-caption text-ink-gray-600 mt-1">Позиций: {{ o.order_items?.length ?? 0 }}</p>
          </NuxtLink>
          <p v-if="!byStatus(col).length" class="text-caption text-ink-gray-400 px-1">—</p>
        </div>
      </div>
    </div>
  </div>
</template>
