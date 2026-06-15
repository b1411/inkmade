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
  <div>
    <UiPageHeader label="Право" title="Юридические документы" />

    <div class="space-y-6">
      <div class="grid sm:grid-cols-2 gap-4">
        <UiPanel title="Условия (ToS)">
          <p class="font-semibold">версия {{ LEGAL.tosVersion }}</p>
          <NuxtLink to="/legal/terms" class="text-caption text-ink-burgundy">Открыть страницу →</NuxtLink>
        </UiPanel>
        <UiPanel title="Конфиденциальность">
          <p class="font-semibold">версия {{ LEGAL.privacyVersion }}</p>
          <NuxtLink to="/legal/privacy" class="text-caption text-ink-burgundy">Открыть страницу →</NuxtLink>
        </UiPanel>
      </div>

      <p class="text-caption text-ink-gray-500">
        Тексты документов хранятся в <code>shared/config/legal.ts</code> и на страницах <code>/legal/*</code>.
        Изменение версии требует правки конфига и редеплоя — согласия фиксируются с номером версии.
      </p>

      <UiEmptyState
        v-if="!consents?.length"
        icon="i-lucide-file-check"
        title="Согласий пока нет"
        text="Согласия пользователей с документами будут фиксироваться здесь."
      />
      <UiPanel v-else title="Журнал согласий" :padded="false">
        <div class="divide-y divide-ink-gray-200 text-caption">
          <div v-for="c in consents" :key="c.id" class="flex items-center justify-between px-6 py-3">
            <span class="text-ink-gray-500">{{ new Date(c.accepted_at).toLocaleString('ru') }}</span>
            <span>{{ typeLabel[c.consent_type] ?? c.consent_type }} · v{{ c.doc_version }}</span>
            <span class="font-mono text-ink-gray-400">{{ c.ip ?? '—' }}</span>
          </div>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
