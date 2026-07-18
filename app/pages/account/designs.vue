<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Сохранённые дизайны (§11.1). RLS — только свои. Показываем ТОЛЬКО is_saved=true:
// заказы создают отдельные копии дизайна (is_saved=false) — их в галерее быть не должно
// (иначе мусор + удаление обнулило бы order_items.design_id).
definePageMeta({ layout: 'account', middleware: 'auth' })
const supabase = useSupabaseClient<Database>()
const { t } = useI18n()
const { date } = useFormat()

const { data: designs, pending, refresh } = await useAsyncData('account-designs', async () => {
  const { data } = await supabase
    .from('designs')
    .select('id, title, preview_url, created_at, products(title, slug, alias)')
    .eq('is_saved', true)
    .order('created_at', { ascending: false })
  return data
})

// Владелец B2B-магазина? Если да — на каждом сохранённом дизайне показываем «Продать в
// магазине» (→ витрина с преселектом). Это убирает трение воронки: раньше владелец после
// сохранения дизайна должен был вручную вернуться в кабинет и заново найти дизайн в списке.
const { getMine } = useMyShop()
const { data: myShop } = await useAsyncData('account-designs-shop', () => getMine())

type DesignRow = NonNullable<typeof designs.value>[number]
const displayTitle = (d: DesignRow) => d.title || d.products?.title || t('account.designs.untitled')

const notify = useNotify()
const sharingId = ref<string | null>(null)

async function share(id: string) {
  if (sharingId.value) return
  sharingId.value = id
  try {
    const { token } = await $fetch<{ token: string }>(`/api/designs/${id}/share`, { method: 'POST' })
    const url = `${window.location.origin}/design/${token}`
    try {
      if (navigator.share) await navigator.share({ title: t('account.designs.shareTitle'), url })
      else { await navigator.clipboard.writeText(url); notify.linkCopied() }
    } catch { /* пользователь отменил системный шэр — не ошибка */ }
  } catch (e) {
    notify.error(t('account.designs.shareErrorTitle'), getFetchMessage(e))
  } finally {
    sharingId.value = null
  }
}

// ── переименование (Фаза C2): title обновляется прямым UPDATE под designs_owner_all ──
const rename = reactive({ open: false, id: '', value: '', busy: false })
function openRename(d: DesignRow) {
  Object.assign(rename, { open: true, id: d.id, value: d.title || '', busy: false })
}
async function saveRename() {
  rename.busy = true
  try {
    const { error } = await supabase.from('designs').update({ title: rename.value.trim() || null }).eq('id', rename.id)
    if (error) throw error
    notify.success(t('account.designs.renamed'))
    rename.open = false
    await refresh()
  } catch (e) {
    notify.error(t('account.designs.actionError'), getFetchMessage(e))
  } finally {
    rename.busy = false
  }
}

// ── удаление (Фаза C2): чистим только строку. Файл превью в Storage НЕ трогаем —
// он может быть общим с копией дизайна в заказе (composition_url). ──
const del = reactive({ open: false, id: '', busy: false })
function openDelete(d: DesignRow) {
  Object.assign(del, { open: true, id: d.id, busy: false })
}
async function confirmDelete() {
  del.busy = true
  try {
    const { error } = await supabase.from('designs').delete().eq('id', del.id)
    if (error) throw error
    notify.success(t('account.designs.deleted'))
    del.open = false
    await refresh()
  } catch (e) {
    notify.error(t('account.designs.actionError'), getFetchMessage(e))
  } finally {
    del.busy = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('account.designs.label')" :title="$t('account.designs.title')" :description="$t('account.designs.description')" />

    <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <UiSkeleton v-for="n in 8" :key="n" rounded="rounded-lg" class="aspect-square" />
    </div>

    <UiEmptyState
      v-else-if="!designs?.length"
      icon="i-lucide-shapes"
      :title="$t('account.designs.emptyTitle')"
      :text="$t('account.designs.emptyText')"
    >
      <UiAppButton to="/catalog" variant="primary" size="md">{{ $t('account.designs.toConstructor') }}</UiAppButton>
    </UiEmptyState>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <UiAppCard v-for="d in designs" :key="d.id" :hover="false" class="overflow-hidden">
        <div class="aspect-square bg-ink-gray-50 flex items-center justify-center">
          <NuxtImg v-if="d.preview_url" :src="d.preview_url" alt="" class="w-full h-full object-cover" sizes="240px" loading="lazy" />
          <UIcon v-else name="i-lucide-shapes" class="size-8 text-ink-gray-400" />
        </div>
        <div class="p-3 space-y-2">
          <div>
            <p class="text-caption font-semibold truncate">{{ displayTitle(d) }}</p>
            <p class="text-[11px] text-ink-gray-400">{{ date(d.created_at) }}</p>
          </div>
          <div class="flex items-center justify-between gap-1">
            <NuxtLink v-if="d.products?.alias" :to="`/customize/${d.products.alias}?from=${d.id}`" class="text-caption text-ink-burgundy shrink-0">{{ $t('account.designs.refine') }}</NuxtLink>
            <div class="flex items-center">
              <UButton v-if="myShop" size="xs" color="primary" variant="ghost" icon="i-lucide-store" :to="`/shop-admin/items?design=${d.id}`" :aria-label="$t('account.designs.sellInShop')" :title="$t('account.designs.sellInShop')" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-share-2" :aria-label="$t('account.designs.share')" :loading="sharingId === d.id" @click="share(d.id)" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" :aria-label="$t('actions.edit')" @click="openRename(d)" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="$t('actions.delete')" @click="openDelete(d)" />
            </div>
          </div>
        </div>
      </UiAppCard>
    </div>

    <!-- переименование -->
    <UModal v-model:open="rename.open" :title="$t('account.designs.renameTitle')">
      <template #body>
        <div class="space-y-4">
          <UInput v-model="rename.value" :placeholder="$t('account.designs.renamePlaceholder')" class="w-full" maxlength="120" />
          <div class="flex gap-3 justify-end">
            <UButton color="neutral" variant="ghost" @click="rename.open = false">{{ $t('actions.cancel') }}</UButton>
            <UButton color="primary" :loading="rename.busy" @click="saveRename">{{ $t('actions.save') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- удаление -->
    <UModal v-model:open="del.open" :title="$t('account.designs.deleteTitle')">
      <template #body>
        <div class="space-y-4">
          <p class="text-ink-gray-600">{{ $t('account.designs.deleteConfirm') }}</p>
          <div class="flex gap-3 justify-end">
            <UButton color="neutral" variant="ghost" @click="del.open = false">{{ $t('actions.cancel') }}</UButton>
            <UButton color="error" :loading="del.busy" @click="confirmDelete">{{ $t('actions.delete') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
