<script setup lang="ts">
// Аудит действий админа (CRM §6.11): смена ролей, цен, публикаций.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t, te } = useI18n()
const { dateTime } = useFormat()
const { auditLog } = useFinance()
const { data: log, pending } = await useAsyncData('admin-audit', () => auditLog(300))

// фильтр по сущности + поиск над загруженным логом (A1)
const q = ref('')
const entityFilter = ref('all')
const entities = computed(() => {
  const set = Array.from(new Set((log.value ?? []).map(e => e.entity)))
  return [{ label: t('admin.audit.allEntities'), value: 'all' }, ...set.map(en => ({ label: te(`admin.audit.entity.${en}`) ? t(`admin.audit.entity.${en}`) : en, value: en }))]
})

function eventTitle(e: { action: string; entity: string }) {
  if (te(`admin.audit.action.${e.action}`)) return t(`admin.audit.action.${e.action}`)
  if (te(`admin.audit.entity.${e.entity}`)) return t(`admin.audit.entity.${e.entity}`)
  return `${e.entity}: ${e.action}`
}
function describe(e: { action: string; entity: string; before: unknown; after: unknown }) {
  const b = (e.before ?? {}) as Record<string, unknown>
  const a = (e.after ?? {}) as Record<string, unknown>
  if (e.action === 'role_change') return `${b.role} → ${a.role}`
  if (e.action === 'product_update') {
    return t('admin.audit.describe.product', {
      priceBefore: String(b.base_price), priceAfter: String(a.base_price),
      activeBefore: String(b.is_active), activeAfter: String(a.is_active),
    })
  }
  switch (e.entity) {
    case 'print_library':
      return t('admin.audit.describe.print', { title: String(a.title), before: String(b.moderation_status ?? '—'), after: String(a.moderation_status) })
    case 'payouts':
      return t('admin.audit.describe.payout', { before: String(b.status ?? '—'), after: String(a.status), amount: String(a.amount) })
    case 'promo_codes':
      return t('admin.audit.describe.promo', { code: String(a.code), state: a.active ? t('admin.audit.describe.promoActive') : t('admin.audit.describe.promoInactive') })
    case 'designer_profiles':
      return t('admin.audit.describe.designer', { before: String(b.royalty_pct ?? '—'), after: String(a.royalty_pct) })
    default: return ''
  }
}

const filteredLog = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (log.value ?? []).filter((e) => {
    if (entityFilter.value !== 'all' && e.entity !== entityFilter.value) return false
    if (term) {
      const hay = `${e.entity} ${e.action} ${eventTitle(e)} ${describe(e)}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
})
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.audit.label')" :title="$t('admin.audit.title')" />

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <UiEmptyState
      v-else-if="!log?.length"
      icon="i-lucide-shield-check"
      :title="$t('admin.audit.empty.title')"
      :text="$t('admin.audit.empty.text')"
    />

    <template v-else>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <UInput v-model="q" icon="i-lucide-search" :placeholder="$t('admin.audit.searchPlaceholder')" class="w-full sm:w-64" />
        <USelect v-model="entityFilter" :items="entities" value-key="value" class="w-48" />
      </div>

      <div v-if="!filteredLog.length" class="py-10 text-center text-ink-gray-400 text-caption">{{ $t('admin.audit.noMatches') }}</div>

      <UiPanel v-else :padded="false">
        <div class="divide-y divide-ink-gray-200 text-caption">
          <div v-for="e in filteredLog" :key="e.id" class="flex items-center justify-between px-6 py-3">
            <span class="text-ink-gray-500 w-32">{{ dateTime(e.created_at) }}</span>
            <span class="w-40 font-semibold">{{ eventTitle(e) }}</span>
            <span class="flex-1 text-ink-gray-600">{{ describe(e) }}</span>
          </div>
        </div>
      </UiPanel>
    </template>
  </div>
</template>
