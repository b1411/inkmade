<script setup lang="ts">
// Дашборд владельца магазина (Фаза B3): ссылка на витрину, статус, быстрые действия.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.dashboard.headTitle') })

const { getMine, listItems, finance } = useMyShop()
const toast = useToast()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade-pi.vercel.app'

const { data: shop } = await useAsyncData('my-shop', () => getMine())
const { data: items } = await useAsyncData('my-shop-items', async () => {
  return shop.value ? await listItems(shop.value.id) : []
})
const { data: fin } = await useAsyncData('my-shop-finance', async () =>
  shop.value ? await finance(shop.value.id) : { balance: null, earnings: [] },
)

const storefrontUrl = computed(() => (shop.value ? `${site}/s/${shop.value.slug}` : ''))
const activeItems = computed(() => (items.value ?? []).filter(i => i.is_active).length)
const money = (n: number | null | undefined) => `${new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0))} ₸`

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

    <!-- быстрые действия -->
    <div class="flex flex-wrap gap-3">
      <UButton to="/shop-admin/items" color="primary" variant="subtle" icon="i-lucide-plus">{{ $t('shopAdmin.dashboard.manageItems') }}</UButton>
      <UButton to="/shop-admin/branding" color="primary" variant="subtle" icon="i-lucide-palette">{{ $t('shopAdmin.dashboard.editBranding') }}</UButton>
      <UButton to="/shop-admin/settings" color="neutral" variant="subtle" icon="i-lucide-settings">{{ $t('shopAdmin.dashboard.settings') }}</UButton>
    </div>
  </div>
</template>
