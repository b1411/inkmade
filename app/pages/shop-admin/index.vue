<script setup lang="ts">
// Дашборд владельца магазина (Фаза B3): ссылка на витрину, статус, быстрые действия.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.dashboard.headTitle') })

import { shopStorefrontUrl } from '~/utils/shopUrl'

const { getMine, listItems, finance, analytics, myDesigns } = useMyShop()
const toast = useToast()
const { public: { siteUrl } } = useRuntimeConfig()

const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: items } = await useAsyncData('my-shop-items', async () => {
  return shop.value ? await listItems(shop.value.id) : []
})
const { data: fin } = await useAsyncData('my-shop-finance', async () =>
  shop.value ? await finance(shop.value.id) : { balance: null, earnings: [] },
)
const { data: stats } = await useAsyncData('my-shop-analytics', async () =>
  shop.value ? await analytics(shop.value.id, 30) : null,
)
const conversion = computed(() => {
  const v = stats.value?.views ?? 0
  return v > 0 ? Math.round(((stats.value?.orders ?? 0) / v) * 100) : 0
})
const maxDaily = computed(() => Math.max(1, ...((stats.value?.daily ?? []).map(d => d.views))))
const { number: fmt, date } = useFormat()

const storefrontUrl = computed(() => (shop.value ? shopStorefrontUrl(shop.value.slug, siteUrl) : ''))
const activeItems = computed(() => (items.value ?? []).filter(i => i.is_active).length)

// сохранённые дизайны владельца — позиция витрины собирается ТОЛЬКО из них
const { data: designs } = await useAsyncData('my-shop-designs', () => myDesigns())

// Онбординг владельца: чеклист настройки из имеющихся данных, без новой инфры.
// Шаг «дизайн» обязателен и раньше в чеклисте отсутствовал: позицию витрины можно
// собрать только из своего сохранённого дизайна (shop_items.design_id ← конструктор),
// поэтому владелец упирался в пустой список товаров без единой подсказки, куда идти.
// Шага «опубликовать витрину» больше нет: is_public по умолчанию true (0066), и он вёл
// в настройки щёлкать уже включённый тумблер — реальным условием была активная позиция.
const steps = computed(() => {
  const s = shop.value
  const hero = (s?.hero ?? {}) as { title?: string; subtitle?: string; banner_url?: string }
  return [
    { key: 'logo', done: !!s?.logo_url, to: '/shop-admin/branding' },
    { key: 'branding', done: !!(hero.title || hero.subtitle || hero.banner_url), to: '/shop-admin/branding' },
    { key: 'design', done: (designs.value ?? []).length > 0, to: '/catalog' },
    { key: 'item', done: activeItems.value > 0, to: '/shop-admin/items' },
  ]
})
const doneCount = computed(() => steps.value.filter(s => s.done).length)
const allDone = computed(() => doneCount.value === steps.value.length)
const { money } = useFormat()

async function copyLink() {
  try {
    await navigator.clipboard.writeText(storefrontUrl.value)
    toast.add({ title: t('shopAdmin.dashboard.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: storefrontUrl.value, color: 'info' })
  }
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.dashboard.label')" :title="shop.name" />

    <!-- онбординг: чеклист настройки (скрывается, когда всё готово) -->
    <UiPanel v-if="!allDone" :title="$t('shopAdmin.onboarding.title')" icon="i-lucide-rocket" class="mb-6">
      <template #actions>
        <span class="text-caption text-ink-gray-500">{{ doneCount }}/{{ steps.length }}</span>
      </template>
      <ul class="space-y-2">
        <li v-for="st in steps" :key="st.key" class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2" :class="st.done ? 'text-ink-gray-400 line-through' : 'text-ink-black'">
            <UIcon :name="st.done ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" :class="st.done ? 'text-ink-success' : 'text-ink-gray-300'" class="size-4 shrink-0" />
            {{ $t(`shopAdmin.onboarding.step.${st.key}`) }}
          </span>
          <UButton v-if="!st.done" :to="st.to" size="xs" color="primary" variant="subtle" trailing-icon="i-lucide-arrow-right">{{ $t('shopAdmin.onboarding.go') }}</UButton>
        </li>
      </ul>
    </UiPanel>

    <!-- ссылка на витрину -->
    <UiPanel :title="$t('shopAdmin.dashboard.storefront')" icon="i-lucide-store" class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <code class="px-3 py-2 rounded-md bg-ink-gray-50 text-sm font-mono break-all">{{ storefrontUrl }}</code>
        <UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-copy" @click="copyLink">{{ $t('shopAdmin.dashboard.copy') }}</UButton>
        <UButton size="sm" color="primary" variant="subtle" icon="i-lucide-external-link" :to="`/s/${shop.slug}`" target="_blank">{{ $t('shopAdmin.dashboard.open') }}</UButton>
      </div>
      <p v-if="!shop.is_public" class="mt-3 text-caption text-ink-warning">
        <UIcon name="i-lucide-eye-off" class="inline size-3.5" /> {{ $t('shopAdmin.dashboard.hiddenHint') }}
      </p>
      <p v-else-if="shop.access_code" class="mt-3 text-caption text-ink-gray-500">
        <UIcon name="i-lucide-lock" class="inline size-3.5" /> {{ $t('shopAdmin.dashboard.closedHint') }}
      </p>
    </UiPanel>

    <!-- метрики -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <UiStatCard :label="$t('shopAdmin.dashboard.earned')" :value="money(fin?.balance?.available)" icon="i-lucide-wallet" accent />
      <UiStatCard :label="$t('shopAdmin.dashboard.itemsActive')" :value="activeItems" icon="i-lucide-shopping-bag" />
      <UiStatCard :label="$t('shopAdmin.dashboard.itemsTotal')" :value="items?.length ?? 0" icon="i-lucide-layers" />
      <UiStatCard :label="$t('shopAdmin.dashboard.share')" :value="`${shop.revenue_share_pct}%`" icon="i-lucide-percent" />
    </div>

    <!-- аналитика витрины (30 дней) -->
    <UiPanel :title="$t('shopAdmin.dashboard.analytics')" icon="i-lucide-line-chart" class="mb-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UiStatCard :label="$t('shopAdmin.dashboard.views')" :value="fmt(stats?.views)" icon="i-lucide-eye" />
        <UiStatCard :label="$t('shopAdmin.dashboard.addToCart')" :value="fmt(stats?.addToCart)" icon="i-lucide-shopping-cart" />
        <UiStatCard :label="$t('shopAdmin.dashboard.sales')" :value="fmt(stats?.orders)" icon="i-lucide-badge-check" />
        <UiStatCard :label="$t('shopAdmin.dashboard.conversion')" :value="`${conversion}%`" icon="i-lucide-percent" accent />
      </div>

      <div v-if="stats?.daily?.length" class="mt-5">
        <p class="text-caption text-ink-gray-500 mb-2">{{ $t('shopAdmin.dashboard.viewsTrend') }}</p>
        <div class="flex items-end gap-0.5 h-24">
          <div
            v-for="d in stats.daily"
            :key="d.day"
            class="flex-1 bg-ink-burgundy/70 hover:bg-ink-burgundy rounded-t transition-colors min-h-0.5"
            :style="{ height: Math.round((d.views / maxDaily) * 100) + '%' }"
            :title="`${date(d.day)}: ${d.views}`"
          />
        </div>
      </div>

      <div v-if="stats?.topItems?.length" class="mt-5">
        <p class="text-caption text-ink-gray-500 mb-2">{{ $t('shopAdmin.dashboard.topItems') }}</p>
        <div class="divide-y divide-ink-gray-100">
          <div v-for="it in stats.topItems" :key="it.id" class="flex items-center justify-between py-2 text-caption">
            <span class="truncate">{{ it.title }}</span>
            <span class="flex items-center gap-3 shrink-0 text-ink-gray-500">
              <span class="inline-flex items-center gap-1"><UIcon name="i-lucide-eye" class="size-3.5" /> {{ it.views }}</span>
              <span class="inline-flex items-center gap-1"><UIcon name="i-lucide-shopping-cart" class="size-3.5" /> {{ it.adds }}</span>
            </span>
          </div>
        </div>
      </div>

      <p v-if="!stats?.views" class="text-caption text-ink-gray-400 mt-4">{{ $t('shopAdmin.dashboard.analyticsEmpty') }}</p>
    </UiPanel>

    <!-- быстрые действия -->
    <div class="flex flex-wrap gap-3">
      <UButton to="/shop-admin/items" color="primary" variant="subtle" icon="i-lucide-plus">{{ $t('shopAdmin.dashboard.manageItems') }}</UButton>
      <UButton to="/shop-admin/branding" color="primary" variant="subtle" icon="i-lucide-palette">{{ $t('shopAdmin.dashboard.editBranding') }}</UButton>
      <UButton to="/shop-admin/settings" color="neutral" variant="subtle" icon="i-lucide-settings">{{ $t('shopAdmin.dashboard.settings') }}</UButton>
    </div>
  </div>
</template>
