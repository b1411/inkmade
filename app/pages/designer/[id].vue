<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Публичная витрина дизайнера (CRM §4.4). Открыта всем: profile.is_public + одобренные принты.
// RLS: designer_profiles виден при is_public; print_library — approved+active.
const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient<Database>()

const { data, error } = await useAsyncData(`vitrine-${id}`, async () => {
  const { data: profile } = await supabase
    .from('designer_profiles')
    .select('id, display_name, bio, avatar_url, is_public')
    .eq('id', id)
    .maybeSingle()
  if (!profile || !profile.is_public) return null
  const { data: prints } = await supabase
    .from('print_library')
    .select('id, title, thumbnail_url, tags')
    .eq('owner_id', id)
    .eq('moderation_status', 'approved')
    .eq('is_active', true)
    .order('id', { ascending: false })
  return { profile, prints: prints ?? [] }
})

if (!data.value || error.value) {
  throw createError({ statusCode: 404, statusMessage: t('customize.designerPage.notFound') })
}

const name = computed(() => data.value?.profile.display_name || t('customize.designerPage.defaultName'))
useHead(() => ({ title: t('customize.designerPage.headTitle', { name: name.value }) }))
useSeoMeta({
  title: () => t('customize.designerPage.headTitle', { name: name.value }),
  description: () => data.value?.profile.bio || t('customize.designerPage.seoDescription', { name: name.value }),
  ogTitle: () => name.value,
})
</script>

<template>
  <section v-if="data" class="space-y-8">
    <!-- шапка автора -->
    <div class="flex items-center gap-4">
      <div class="size-16 rounded-full bg-ink-gray-200 overflow-hidden shrink-0">
        <img v-if="data.profile.avatar_url" :src="data.profile.avatar_url" :alt="name" class="w-full h-full object-cover">
        <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
          <UIcon name="i-lucide-palette" class="size-7" />
        </div>
      </div>
      <div>
        <UiSectionLabel accent>{{ $t('customize.designerPage.author') }}</UiSectionLabel>
        <h1 class="ink-display text-h2">{{ name }}</h1>
        <p v-if="data.profile.bio" class="text-caption text-ink-gray-600 mt-1 max-w-prose">{{ data.profile.bio }}</p>
      </div>
    </div>

    <!-- принты автора -->
    <div>
      <UiSectionLabel>{{ $t('customize.designerPage.prints', { count: data.prints.length }) }}</UiSectionLabel>
      <UiEmptyState
        v-if="!data.prints.length"
        icon="i-lucide-image"
        :title="$t('customize.designerPage.emptyTitle')"
        :text="$t('customize.designerPage.emptyText')"
      />
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
        <div v-for="p in data.prints" :key="p.id" class="border border-ink-gray-200 rounded-lg shadow-sm overflow-hidden group">
          <div class="aspect-square bg-ink-gray-200">
            <img v-if="p.thumbnail_url" :src="p.thumbnail_url" :alt="p.title" class="w-full h-full object-contain group-hover:scale-105 transition-transform">
          </div>
          <div class="p-3">
            <p class="text-caption font-semibold truncate">{{ p.title }}</p>
          </div>
        </div>
      </div>
    </div>

    <UButton to="/catalog" color="primary" variant="subtle" icon="i-lucide-shopping-bag">
      {{ $t('customize.designerPage.orderCta') }}
    </UButton>
  </section>
</template>
