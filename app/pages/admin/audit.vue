<script setup lang="ts">
// Аудит действий админа (CRM §6.11): смена ролей, цен, публикаций.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { auditLog } = useFinance()
const { data: log, pending } = await useAsyncData('admin-audit', () => auditLog(300))

const actionLabel: Record<string, string> = {
  role_change: 'Смена роли',
  product_update: 'Изменение товара',
}
const entityLabel: Record<string, string> = {
  profile: 'Пользователь', product: 'Товар', print_library: 'Принт',
  payouts: 'Выплата', promo_codes: 'Промокод', designer_profiles: 'Дизайнер',
}
function eventTitle(e: { action: string; entity: string }) {
  return actionLabel[e.action] ?? entityLabel[e.entity] ?? `${e.entity}: ${e.action}`
}
function describe(e: { action: string; entity: string; before: unknown; after: unknown }) {
  const b = (e.before ?? {}) as Record<string, unknown>
  const a = (e.after ?? {}) as Record<string, unknown>
  if (e.action === 'role_change') return `${b.role} → ${a.role}`
  if (e.action === 'product_update') return `цена ${b.base_price}→${a.base_price}, активен ${b.is_active}→${a.is_active}`
  switch (e.entity) {
    case 'print_library': return `«${a.title}»: модерация ${b.moderation_status ?? '—'} → ${a.moderation_status}`
    case 'payouts': return `выплата ${b.status ?? '—'} → ${a.status} (${a.amount} ₸)`
    case 'promo_codes': return `${a.code}: ${a.active ? 'активен' : 'выключен'}`
    case 'designer_profiles': return `ставка ${b.royalty_pct ?? '—'}% → ${a.royalty_pct}%`
    default: return ''
  }
}
</script>

<template>
  <div>
    <UiPageHeader label="Безопасность" title="Аудит действий" />

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <UiEmptyState
      v-else-if="!log?.length"
      icon="i-lucide-shield-check"
      title="Записей пока нет"
      text="Действия администратора будут появляться здесь."
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
