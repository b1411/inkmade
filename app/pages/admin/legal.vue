<script setup lang="ts">
// Юр.документы (CRM §6.9): версии документов + лог согласий пользователей.
import { LEGAL } from '~~/shared/config/legal'
import type { Database } from '~/types/database.types'
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const supabase = useSupabaseClient<Database>()

const { data: consents } = await useAsyncData('admin-consents', async () => {
  const { data } = await supabase
    .from('user_consents')
    .select('id, consent_type, doc_version, ip, accepted_at')
    .order('accepted_at', { ascending: false })
    .limit(100)
  return data
})
const typeLabel = computed<Record<string, string>>(() => ({
  tos: t('admin.legalAdmin.typeTos'),
  privacy: t('admin.legalAdmin.typePrivacy'),
  copyright: t('admin.legalAdmin.typeCopyright'),
}))
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.legalAdmin.label')" :title="$t('admin.legalAdmin.title')" />

    <div class="space-y-6">
      <div class="grid sm:grid-cols-2 gap-4">
        <UiPanel :title="$t('admin.legalAdmin.tosTitle')">
          <p class="font-semibold">{{ $t('admin.legalAdmin.version', { version: LEGAL.tosVersion }) }}</p>
          <NuxtLink to="/legal/terms" class="text-caption text-ink-burgundy">{{ $t('admin.legalAdmin.openPage') }}</NuxtLink>
        </UiPanel>
        <UiPanel :title="$t('admin.legalAdmin.privacyTitle')">
          <p class="font-semibold">{{ $t('admin.legalAdmin.version', { version: LEGAL.privacyVersion }) }}</p>
          <NuxtLink to="/legal/privacy" class="text-caption text-ink-burgundy">{{ $t('admin.legalAdmin.openPage') }}</NuxtLink>
        </UiPanel>
      </div>

      <p class="text-caption text-ink-gray-500">
        {{ $t('admin.legalAdmin.configHint') }}
      </p>

      <UiEmptyState
        v-if="!consents?.length"
        icon="i-lucide-file-check"
        :title="$t('admin.legalAdmin.consentsEmptyTitle')"
        :text="$t('admin.legalAdmin.consentsEmptyText')"
      />
      <UiPanel v-else :title="$t('admin.legalAdmin.consentsLogTitle')" :padded="false">
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
