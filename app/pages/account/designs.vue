<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Сохранённые дизайны (§11.1). RLS — только свои.
definePageMeta({ layout: 'account', middleware: 'auth' })
const supabase = useSupabaseClient<Database>()
const { t } = useI18n()

const { data: designs, pending } = await useAsyncData('account-designs', async () => {
  const { data } = await supabase
    .from('designs')
    .select('id, preview_url, created_at, products(title, slug, alias)')
    .order('created_at', { ascending: false })
  return data
})

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
    notify.error(t('account.designs.shareErrorTitle'), (e as Error).message)
  } finally {
    sharingId.value = null
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
          <p class="text-caption font-semibold truncate">{{ d.products?.title }}</p>
          <div class="flex items-center justify-between gap-2">
            <NuxtLink v-if="d.products?.alias" :to="`/customize/${d.products.alias}?from=${d.id}`" class="text-caption text-ink-burgundy">{{ $t('account.designs.refine') }}</NuxtLink>
            <UButton
              size="xs" color="neutral" variant="ghost" icon="i-lucide-share-2"
              :loading="sharingId === d.id" @click="share(d.id)"
            >
              {{ $t('account.designs.share') }}
            </UButton>
          </div>
        </div>
      </UiAppCard>
    </div>
  </div>
</template>
