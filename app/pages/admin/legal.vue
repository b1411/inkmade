<script setup lang="ts">
// Юр.документы (CRM §6.9): версии документов + лог согласий пользователей.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
import { LEGAL } from '~~/shared/config/legal'
import type { Database } from '~/types/database.types'
const supabase = useSupabaseClient<Database>()

const { data: consents } = await useAsyncData('admin-consents', async () => {
  const { data } = await supabase
    .from('user_consents')
    .select('id, consent_type, doc_version, ip, accepted_at')
    .order('accepted_at', { ascending: false })
    .limit(100)
  return data
})
const typeLabel: Record<string, string> = { tos: 'Условия', privacy: 'Конфиденциальность', copyright: 'Авторские права' }
</script>

<template>
  <div class="space-y-8">
    <div>
      <UiSectionLabel accent>Право</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Юридические документы</h1>
    </div>

    <div class="grid sm:grid-cols-2 gap-4">
      <div class="border border-ink-gray-200 rounded-lg p-4">
        <p class="ink-label text-ink-gray-600">Условия (ToS)</p>
        <p class="font-semibold mt-1">версия {{ LEGAL.tosVersion }}</p>
        <NuxtLink to="/legal/terms" class="text-caption text-ink-burgundy">Открыть страницу →</NuxtLink>
      </div>
      <div class="border border-ink-gray-200 rounded-lg p-4">
        <p class="ink-label text-ink-gray-600">Конфиденциальность</p>
        <p class="font-semibold mt-1">версия {{ LEGAL.privacyVersion }}</p>
        <NuxtLink to="/legal/privacy" class="text-caption text-ink-burgundy">Открыть страницу →</NuxtLink>
      </div>
    </div>

    <p class="text-caption text-ink-gray-500">
      Тексты документов хранятся в <code>shared/config/legal.ts</code> и на страницах <code>/legal/*</code>.
      Изменение версии требует правки конфига и редеплоя — согласия фиксируются с номером версии.
    </p>

    <section>
      <UiSectionLabel accent>Журнал согласий</UiSectionLabel>
      <div v-if="!consents?.length" class="py-3 text-ink-gray-600 text-caption">Согласий пока нет.</div>
      <div v-else class="mt-3 border border-ink-gray-200 rounded-lg divide-y divide-ink-gray-200 text-caption">
        <div v-for="c in consents" :key="c.id" class="flex items-center justify-between p-3">
          <span class="text-ink-gray-500">{{ new Date(c.accepted_at).toLocaleString('ru') }}</span>
          <span>{{ typeLabel[c.consent_type] ?? c.consent_type }} · v{{ c.doc_version }}</span>
          <span class="font-mono text-ink-gray-400">{{ c.ip ?? '—' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
