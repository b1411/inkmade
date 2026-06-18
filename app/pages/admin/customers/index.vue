<script setup lang="ts">
import { formatPrice, formatDate } from '~/utils/format'
import { formatKzPhone } from '~~/shared/config/phone'

// CRM: список клиентов с агрегатами (заказы, LTV, последний заказ). Только admin.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
useHead({ title: t('admin.customers.headTitle') })

const { list } = useCustomers()
const { data: customers, pending } = await useAsyncData('admin-customers', () => list())

const search = ref('')
const sort = ref<'recent' | 'spent' | 'orders'>('recent')
const sortItems = computed(() => [
  { label: t('admin.customers.sort.recent'), value: 'recent' },
  { label: t('admin.customers.sort.spent'), value: 'spent' },
  { label: t('admin.customers.sort.orders'), value: 'orders' },
])

const rows = computed(() => {
  let list = customers.value ?? []
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      `${c.full_name ?? ''} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q),
    )
  }
  const arr = [...list]
  if (sort.value === 'spent') arr.sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
  else if (sort.value === 'orders') arr.sort((a, b) => Number(b.orders_count) - Number(a.orders_count))
  // 'recent' уже отсортирован на сервере
  return arr
})

// сводка сверху
const totals = computed(() => {
  const list = customers.value ?? []
  return {
    count: list.length,
    paying: list.filter(c => Number(c.orders_count) > 0).length,
    revenue: list.reduce((s, c) => s + Number(c.total_spent || 0), 0),
  }
})
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.customers.label')" :title="$t('admin.customers.title')" :description="$t('admin.customers.description')" />

    <div v-if="pending" class="space-y-3">
      <div class="grid sm:grid-cols-3 gap-4">
        <UiSkeleton v-for="n in 3" :key="n" rounded="rounded-lg" class="h-24" />
      </div>
      <UiSkeleton v-for="n in 6" :key="`r${n}`" rounded="rounded-lg" class="h-12" />
    </div>

    <template v-else>
      <!-- сводка -->
      <div class="grid sm:grid-cols-3 gap-4 mb-6">
        <UiStatCard :label="$t('admin.customers.summary.count')" :value="totals.count" icon="i-lucide-users" />
        <UiStatCard :label="$t('admin.customers.summary.paying')" :value="totals.paying" icon="i-lucide-shopping-bag" />
        <UiStatCard :label="$t('admin.customers.summary.revenue')" :value="formatPrice(totals.revenue)" icon="i-lucide-wallet" accent />
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <UInput v-model="search" icon="i-lucide-search" :placeholder="$t('admin.customers.searchPlaceholder')" class="w-72" />
        <USelect v-model="sort" :items="sortItems" value-key="value" class="w-56" />
      </div>

      <UiEmptyState v-if="!rows.length" icon="i-lucide-users" :title="$t('admin.customers.empty.title')" :text="$t('admin.customers.empty.text')" />

      <UiPanel v-else :padded="false">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                <th class="px-6 py-3">{{ $t('admin.customers.table.customer') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customers.table.phone') }}</th>
                <th class="px-6 py-3 text-right">{{ $t('admin.customers.table.orders') }}</th>
                <th class="px-6 py-3 text-right">{{ $t('admin.customers.table.spent') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customers.table.lastOrder') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customers.table.contact') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in rows" :key="c.id" class="border-b border-ink-gray-200 hover:bg-ink-gray-200/30">
                <td class="px-6 py-3">
                  <NuxtLink :to="`/admin/customers/${c.id}`" class="font-semibold hover:text-ink-burgundy">
                    {{ c.full_name || $t('admin.customers.noName') }}
                  </NuxtLink>
                  <p class="text-caption text-ink-gray-500">{{ c.email }}</p>
                </td>
                <td class="px-6 py-3 font-mono text-sm">{{ c.phone ? formatKzPhone(c.phone) : '—' }}</td>
                <td class="px-6 py-3 text-right">{{ c.orders_count }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ formatPrice(Number(c.total_spent)) }}</td>
                <td class="px-6 py-3 text-caption text-ink-gray-600">{{ c.last_order_at ? formatDate(c.last_order_at) : '—' }}</td>
                <td class="px-6 py-3">
                  <UBadge v-if="c.marketing_consent" color="success" variant="subtle" size="xs">{{ $t('admin.customers.consent') }}</UBadge>
                  <span v-else class="text-caption text-ink-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiPanel>
    </template>
  </div>
</template>
