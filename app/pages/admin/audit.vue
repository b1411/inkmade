<script setup lang="ts">
// Аудит действий админа (CRM §6.11): смена ролей, цен, публикаций.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t, te } = useI18n()
const { auditLog } = useFinance()
const { data: log, pending } = await useAsyncData('admin-audit', () => auditLog(300))

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

    <UiPanel v-else :padded="false">
      <div class="divide-y divide-ink-gray-200 text-caption">
        <div v-for="e in log" :key="e.id" class="flex items-center justify-between px-6 py-3">
          <span class="text-ink-gray-500 w-32">{{ new Date(e.created_at).toLocaleString('ru') }}</span>
          <span class="w-40 font-semibold">{{ eventTitle(e) }}</span>
          <span class="flex-1 text-ink-gray-600">{{ describe(e) }}</span>
        </div>
      </div>
    </UiPanel>
  </div>
</template>
