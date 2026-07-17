<script setup lang="ts">
import { formatKzPhone, whatsAppLink, telLink } from '~~/shared/config/phone'

// Лиды (§CRM): контакты клиентов для связи в WhatsApp/звонком. Только admin.
// Источник — admin_list_users (phone + marketing_consent). Полноценной phone-OTP
// авторизации нет; телефон собирается как поле профиля при регистрации.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const { dateShort } = useFormat()
useHead({ title: t('admin.leads.headTitle') })

const { listUsers } = useUsers()
const toast = useToast()

const { data: users, pending } = await useAsyncData('admin-leads', () => listUsers())

// фильтр: только согласившиеся, только с телефоном, поиск
const onlyConsent = ref(false)
const search = ref('')

const leads = computed(() => {
  const all = (users.value ?? []).filter(u => !!u.phone)
  return all.filter((u) => {
    if (onlyConsent.value && !u.marketing_consent) return false
    if (search.value.trim()) {
      const q = search.value.trim().toLowerCase()
      const hay = `${u.full_name ?? ''} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const greeting = t('admin.leads.greeting')

function exportCsv() {
  const rows = leads.value
  if (!rows.length) {
    toast.add({ title: t('admin.leads.noLeadsToExport'), color: 'warning' })
    return
  }
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = [
    t('admin.leads.csv.name'), t('admin.leads.csv.phone'), t('admin.leads.csv.email'),
    t('admin.leads.csv.consent'), t('admin.leads.csv.registered'),
  ]
  const lines = rows.map(u => [
    esc(u.full_name ?? ''),
    esc(formatKzPhone(u.phone)),
    esc(u.email ?? ''),
    esc(u.marketing_consent ? t('admin.leads.csv.yes') : t('admin.leads.csv.no')),
    esc(dateShort(u.created_at)),
  ].join(','))
  // BOM для корректной кириллицы в Excel
  const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inkmade-leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.leads.label')" :title="$t('admin.leads.title')" :description="$t('admin.leads.description', { n: leads.length })">
      <template #actions>
        <UButton icon="i-lucide-download" color="neutral" variant="subtle" @click="exportCsv">{{ $t('admin.leads.exportCsv') }}</UButton>
      </template>
    </UiPageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="search" icon="i-lucide-search" :placeholder="$t('admin.leads.searchPlaceholder')" class="w-72" />
      <UCheckbox v-model="onlyConsent" :label="$t('admin.leads.onlyConsent')" />
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>

    <UiEmptyState
      v-else-if="!leads.length"
      icon="i-lucide-users"
      :title="$t('admin.leads.empty.title')"
      :description="$t('admin.leads.empty.description')"
    />

    <div v-else class="overflow-x-auto">
    <table class="min-w-[760px] w-full text-left border-collapse">
      <thead>
        <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
          <th class="py-2 pr-4">{{ $t('admin.leads.table.name') }}</th>
          <th class="py-2 pr-4">{{ $t('admin.leads.table.phone') }}</th>
          <th class="py-2 pr-4">{{ $t('admin.leads.table.email') }}</th>
          <th class="py-2 pr-4">{{ $t('admin.leads.table.consent') }}</th>
          <th class="py-2 pr-4">{{ $t('admin.leads.table.date') }}</th>
          <th class="py-2 text-right">{{ $t('admin.leads.table.contact') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in leads" :key="u.id" class="border-b border-ink-gray-200">
          <td class="py-3 pr-4">{{ u.full_name ?? '—' }}</td>
          <td class="py-3 pr-4 font-mono text-sm">{{ formatKzPhone(u.phone) }}</td>
          <td class="py-3 pr-4 text-ink-gray-600">{{ u.email }}</td>
          <td class="py-3 pr-4">
            <UBadge v-if="u.marketing_consent" color="success" variant="subtle" size="sm">{{ $t('admin.leads.yes') }}</UBadge>
            <UBadge v-else color="neutral" variant="subtle" size="sm">{{ $t('admin.leads.no') }}</UBadge>
          </td>
          <td class="py-3 pr-4 text-ink-gray-600 text-sm">{{ dateShort(u.created_at) }}</td>
          <td class="py-3 text-right whitespace-nowrap">
            <UButton
              v-if="whatsAppLink(u.phone)"
              :to="whatsAppLink(u.phone, greeting)!"
              target="_blank"
              size="sm"
              color="success"
              variant="subtle"
              icon="i-lucide-message-circle"
              class="mr-1"
            >{{ $t('admin.leads.whatsApp') }}</UButton>
            <UButton
              v-if="telLink(u.phone)"
              :to="telLink(u.phone)!"
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-phone"
            >{{ $t('admin.leads.call') }}</UButton>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>
