<script setup lang="ts">
import { formatPrice, formatDate } from '~/utils/format'
import { formatKzPhone, whatsAppLink, telLink } from '~~/shared/config/phone'

// CRM: карточка клиента 360° — контакты, заказы, LTV, адреса. Только admin.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()

const route = useRoute()
const id = route.params.id as string
const { get } = useCustomers()
const { data, error } = await useAsyncData(`admin-customer-${id}`, () => get(id))
if (error.value || !data.value?.profile) {
  throw createError({ statusCode: 404, statusMessage: t('admin.customer.notFound') })
}
const profile = computed(() => data.value!.profile!)
useHead(() => ({ title: t('admin.customer.headTitle', { name: profile.value.full_name || profile.value.email }) }))

const badgeColor = (s: string) =>
  s === 'delivered' ? 'success' : s === 'cancelled' || s === 'refunded' ? 'error'
    : s === 'on_hold' || s === 'reprint' ? 'warning' : 'neutral'
const shortId = (s: string) => s.slice(0, 8)
const greeting = t('admin.customer.greeting')
</script>

<template>
  <div v-if="data">
    <UiPageHeader :label="$t('admin.customer.label')" :title="profile.full_name || $t('admin.customer.noName')" :description="profile.email">
      <template #actions>
        <UButton to="/admin/customers" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('admin.customer.backToList') }}</UButton>
      </template>
    </UiPageHeader>

    <!-- KPI -->
    <div class="grid sm:grid-cols-3 gap-4 mb-6">
      <UiStatCard :label="$t('admin.customer.kpi.orders')" :value="data.stats.orders_count" icon="i-lucide-package" />
      <UiStatCard :label="$t('admin.customer.kpi.ltv')" :value="formatPrice(Number(data.stats.total_spent))" icon="i-lucide-wallet" accent />
      <UiStatCard :label="$t('admin.customer.kpi.lastOrder')" :value="data.stats.last_order_at ? formatDate(data.stats.last_order_at) : '—'" icon="i-lucide-clock" />
    </div>

    <div class="grid lg:grid-cols-[320px_1fr] gap-6">
      <!-- контакты + адреса -->
      <div class="space-y-6">
        <UiPanel :title="$t('admin.customer.contacts.title')" icon="i-lucide-id-card">
          <div class="space-y-3 text-caption">
            <div>
              <p class="ink-label text-ink-gray-500">{{ $t('admin.customer.contacts.email') }}</p>
              <p class="font-medium break-all">{{ profile.email }}</p>
            </div>
            <div v-if="profile.phone">
              <p class="ink-label text-ink-gray-500">{{ $t('admin.customer.contacts.phone') }}</p>
              <p class="font-mono">{{ formatKzPhone(profile.phone) }}</p>
              <div class="flex gap-2 mt-2">
                <UButton v-if="whatsAppLink(profile.phone, greeting)" :to="whatsAppLink(profile.phone, greeting)!" target="_blank" size="xs" color="success" variant="subtle" icon="i-lucide-message-circle">{{ $t('admin.customer.contacts.whatsApp') }}</UButton>
                <UButton v-if="telLink(profile.phone)" :to="telLink(profile.phone)!" size="xs" color="neutral" variant="ghost" icon="i-lucide-phone">{{ $t('admin.customer.contacts.call') }}</UButton>
              </div>
            </div>
            <div>
              <p class="ink-label text-ink-gray-500">{{ $t('admin.customer.contacts.consent') }}</p>
              <UBadge :color="profile.marketing_consent ? 'success' : 'neutral'" variant="subtle" size="xs">
                {{ profile.marketing_consent ? $t('admin.customer.contacts.yes') : $t('admin.customer.contacts.no') }}
              </UBadge>
            </div>
            <div>
              <p class="ink-label text-ink-gray-500">{{ $t('admin.customer.contacts.registered') }}</p>
              <p>{{ formatDate(profile.created_at) }}</p>
            </div>
          </div>
        </UiPanel>

        <UiPanel :title="$t('admin.customer.addresses.title')" icon="i-lucide-map-pin" :padded="false">
          <div v-if="data.addresses.length" class="divide-y divide-ink-gray-200">
            <div v-for="a in data.addresses" :key="a.id" class="px-6 py-3 text-caption">
              <p class="font-medium">
                {{ a.full_name }}
                <UBadge v-if="a.is_default" color="primary" variant="subtle" size="xs" class="ml-1">{{ $t('admin.customer.addresses.default') }}</UBadge>
              </p>
              <p class="text-ink-gray-600">{{ a.phone }} · {{ a.city }}, {{ a.address }}</p>
            </div>
          </div>
          <p v-else class="px-6 py-4 text-caption text-ink-gray-400">{{ $t('admin.customer.addresses.empty') }}</p>
        </UiPanel>
      </div>

      <!-- история заказов -->
      <UiPanel :title="$t('admin.customer.ordersHistory.title')" icon="i-lucide-receipt" :padded="false">
        <div v-if="data.orders.length" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                <th class="px-6 py-3">{{ $t('admin.customer.ordersHistory.table.number') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customer.ordersHistory.table.date') }}</th>
                <th class="px-6 py-3 text-right">{{ $t('admin.customer.ordersHistory.table.sum') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customer.ordersHistory.table.status') }}</th>
                <th class="px-6 py-3">{{ $t('admin.customer.ordersHistory.table.payment') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in data.orders" :key="o.id" class="border-b border-ink-gray-200 hover:bg-ink-gray-200/30">
                <td class="px-6 py-3">
                  <NuxtLink :to="`/admin/orders/${o.id}`" class="ink-label hover:text-ink-burgundy">#{{ shortId(o.id) }}</NuxtLink>
                </td>
                <td class="px-6 py-3 text-caption">{{ formatDate(o.created_at) }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ formatPrice(o.total) }}</td>
                <td class="px-6 py-3"><UBadge :color="badgeColor(o.status)" variant="subtle">{{ $t(`domain.orderStatus.${o.status}`) }}</UBadge></td>
                <td class="px-6 py-3 text-caption">
                  <span v-if="o.paid_at" class="text-ink-success">{{ $t('admin.customer.ordersHistory.paid') }}</span>
                  <span v-else class="text-ink-gray-400">{{ $t('admin.customer.ordersHistory.notPaid') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <UiEmptyState v-else icon="i-lucide-package" :title="$t('admin.customer.ordersHistory.empty.title')" :text="$t('admin.customer.ordersHistory.empty.text')" />
      </UiPanel>
    </div>
  </div>
</template>
