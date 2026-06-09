<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Сохранённые дизайны (§11.1). RLS — только свои.
definePageMeta({ layout: 'account', middleware: 'auth' })
const supabase = useSupabaseClient<Database>()

const { data: designs, pending } = await useAsyncData('account-designs', async () => {
  const { data } = await supabase
    .from('designs')
    .select('id, preview_url, created_at, products(title, slug, alias)')
    .order('created_at', { ascending: false })
  return data
})

const toast = useToast()
const sharingId = ref<string | null>(null)

async function share(id: string) {
  if (sharingId.value) return
  sharingId.value = id
  try {
    const { token } = await $fetch<{ token: string }>(`/api/designs/${id}/share`, { method: 'POST' })
    const url = `${window.location.origin}/design/${token}`
    try {
      if (navigator.share) await navigator.share({ title: 'Мой дизайн на INKMADE', url })
      else { await navigator.clipboard.writeText(url); toast.add({ title: 'Ссылка скопирована', color: 'success' }) }
    } catch { /* пользователь отменил системный шэр — не ошибка */ }
  } catch (e) {
    toast.add({ title: 'Не удалось создать ссылку', description: (e as Error).message, color: 'error' })
  } finally {
    sharingId.value = null
  }
}
</script>

<template>
  <div>
    <UiSectionLabel accent>Дизайны</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Мои дизайны</h1>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
    <div v-else-if="!designs?.length" class="py-10 text-center text-ink-gray-600">
      Дизайнов пока нет. Соберите принт в <NuxtLink to="/catalog" class="text-ink-burgundy font-semibold">конструкторе</NuxtLink>.
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="d in designs" :key="d.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
        <div class="aspect-square bg-ink-gray-200 flex items-center justify-center">
          <img v-if="d.preview_url" :src="d.preview_url" alt="" class="w-full h-full object-cover">
          <UIcon v-else name="i-lucide-shapes" class="size-8 text-ink-gray-400" />
        </div>
        <div class="p-3 space-y-2">
          <p class="text-caption font-semibold truncate">{{ d.products?.title }}</p>
          <div class="flex items-center justify-between gap-2">
            <NuxtLink v-if="d.products?.alias" :to="`/customize/${d.products.alias}?from=${d.id}`" class="text-caption text-ink-burgundy">Доработать</NuxtLink>
            <UButton
              size="xs" color="neutral" variant="ghost" icon="i-lucide-share-2"
              :loading="sharingId === d.id" @click="share(d.id)"
            >
              Поделиться
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
