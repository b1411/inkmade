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
        <div class="p-3">
          <p class="text-caption font-semibold truncate">{{ d.products?.title }}</p>
          <NuxtLink v-if="d.products?.alias" :to="`/customize/${d.products.alias}`" class="text-caption text-ink-burgundy">Открыть в конструкторе</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
