<script setup lang="ts">
import { formatKzPhone, whatsAppLink, telLink } from '~~/shared/config/phone'
import { formatDate } from '~/utils/format'

// Лиды (§CRM): контакты клиентов для связи в WhatsApp/звонком. Только admin.
// Источник — admin_list_users (phone + marketing_consent). Полноценной phone-OTP
// авторизации нет; телефон собирается как поле профиля при регистрации.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
useHead({ title: 'Лиды — INKMADE' })

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

const greeting = 'Здравствуйте! Это INKMADE 👕'

function exportCsv() {
  const rows = leads.value
  if (!rows.length) {
    toast.add({ title: 'Нет лидов для экспорта', color: 'warning' })
    return
  }
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['Имя', 'Телефон', 'Email', 'Согласие на связь', 'Дата регистрации']
  const lines = rows.map(u => [
    esc(u.full_name ?? ''),
    esc(formatKzPhone(u.phone)),
    esc(u.email ?? ''),
    esc(u.marketing_consent ? 'да' : 'нет'),
    esc(formatDate(u.created_at)),
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
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <UiSectionLabel accent>CRM</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-2">Лиды</h1>
        <p class="text-caption text-ink-gray-600 mt-1">
          Контакты клиентов для связи в WhatsApp и по телефону. Всего: {{ leads.length }}.
        </p>
      </div>
      <UButton icon="i-lucide-download" color="neutral" variant="subtle" @click="exportCsv">
        Экспорт CSV
      </UButton>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Поиск по имени, телефону, email" class="w-72" />
      <UCheckbox v-model="onlyConsent" label="Только давшие согласие на связь" />
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>

    <UiEmptyState
      v-else-if="!leads.length"
      icon="i-lucide-users"
      title="Пока нет лидов"
      description="Контакты появятся после регистрации клиентов с указанием телефона."
    />

    <table v-else class="w-full text-left border-collapse">
      <thead>
        <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
          <th class="py-2 pr-4">Имя</th>
          <th class="py-2 pr-4">Телефон</th>
          <th class="py-2 pr-4">Email</th>
          <th class="py-2 pr-4">Согласие</th>
          <th class="py-2 pr-4">Дата</th>
          <th class="py-2 text-right">Связаться</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in leads" :key="u.id" class="border-b border-ink-gray-200">
          <td class="py-3 pr-4">{{ u.full_name ?? '—' }}</td>
          <td class="py-3 pr-4 font-mono text-sm">{{ formatKzPhone(u.phone) }}</td>
          <td class="py-3 pr-4 text-ink-gray-600">{{ u.email }}</td>
          <td class="py-3 pr-4">
            <UBadge v-if="u.marketing_consent" color="success" variant="subtle" size="sm">да</UBadge>
            <UBadge v-else color="neutral" variant="subtle" size="sm">нет</UBadge>
          </td>
          <td class="py-3 pr-4 text-ink-gray-600 text-sm">{{ formatDate(u.created_at) }}</td>
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
            >WhatsApp</UButton>
            <UButton
              v-if="telLink(u.phone)"
              :to="telLink(u.phone)!"
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-phone"
            >Позвонить</UButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
