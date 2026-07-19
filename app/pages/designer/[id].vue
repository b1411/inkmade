<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Публичная витрина дизайнера (CRM §4.4). Открыта всем: одобренные принты публичного автора.
// Профиль читаем через RPC public_designer_profile — она отдаёт ТОЛЬКО безопасные колонки
// (без payout_details/tax_status/royalty_pct) и только is_public=true (миграции 0057/0058).
// Прямой select из designer_profiles закрыт RLS до владельца/админа.
const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient<Database>()

const { data, error } = await useAsyncData(`vitrine-${id}`, async () => {
  const { data: rows } = await supabase.rpc('public_designer_profile', { p_id: id })
  const profile = rows?.[0] ?? null
  if (!profile) return null
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
    <div class="grid overflow-hidden border border-ink-gray-200 bg-ink-black text-white lg:grid-cols-[1.05fr_.95fr]">
      <div class="flex min-h-80 flex-col justify-between p-6 sm:p-10 lg:min-h-[430px] lg:p-12">
        <UiSectionLabel accent>{{ $t('customize.designerPage.author') }}</UiSectionLabel>
        <div>
          <div class="mb-6 size-20 overflow-hidden rounded-full border border-white/20 bg-white/10">
            <img v-if="data.profile.avatar_url" :src="data.profile.avatar_url" :alt="name" class="size-full object-cover">
            <div v-else class="grid size-full place-items-center text-white/60">
              <UIcon name="i-lucide-palette" class="size-8" />
            </div>
          </div>
          <h1 class="ink-display text-[clamp(3rem,7vw,6.5rem)] leading-[.86] tracking-[-.05em]">{{ name }}</h1>
          <p v-if="data.profile.bio" class="mt-5 max-w-xl text-white/60">{{ data.profile.bio }}</p>
        </div>
      </div>
      <div class="relative min-h-72 overflow-hidden lg:min-h-[430px]">
        <NuxtImg src="/media/campaigns/audience-creators-v03.webp" alt="" class="absolute inset-0 size-full object-cover" sizes="(max-width: 1023px) 100vw, 580px" loading="eager" />
        <div class="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
        <span class="absolute bottom-5 left-5 ink-label text-white/70">INKMADE / CREATOR</span>
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
      <div v-else class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NuxtLink v-for="p in data.prints" :key="p.id" :to="`/customize/tshirt?print=${p.id}`" class="group overflow-hidden border border-ink-gray-200 bg-ink-white shadow-sm transition hover:-translate-y-1 hover:border-ink-burgundy">
          <div class="aspect-square overflow-hidden bg-ink-gray-200">
            <img v-if="p.thumbnail_url" :src="p.thumbnail_url" :alt="p.title" class="size-full object-cover transition-transform duration-500 group-hover:scale-105">
            <div v-else class="grid size-full place-items-center"><UIcon name="i-lucide-image" class="size-8 text-ink-gray-400" /></div>
          </div>
          <div class="flex items-center justify-between gap-2 p-3">
            <p class="truncate text-caption font-semibold">{{ p.title }}</p>
            <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-ink-burgundy transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </NuxtLink>
      </div>
    </div>

    <UButton to="/catalog" color="primary" variant="subtle" icon="i-lucide-shopping-bag">
      {{ $t('customize.designerPage.orderCta') }}
    </UButton>
  </section>
</template>
