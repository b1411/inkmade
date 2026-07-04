<script setup lang="ts">
import { formatKzPhone, whatsAppLink, telLink } from '~~/shared/config/phone'
import { formatDate } from '~/utils/format'
import { FEATURES } from '~~/shared/config/features'

// Очередь заявок на B2B-магазины (Фаза B1/B2). Только admin. Reject/связь с заявителем.
// Approve: при b2bStorefront создаёт магазин из заявки (admin_create_shop) + даёт ссылку
// на витрину; без флага — просто помечает статус (поведение B1).
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
useHead({ title: t('admin.shops.headTitle') })

const { listApplications, resolve } = useBusiness()
const { createShop, listShops, setShopStatus, setShopShare, reissueClaim } = useShops()
const toast = useToast()

const { data: apps, pending, refresh } = await useAsyncData('admin-shop-apps', () => listApplications())
// список созданных магазинов (только при включённой витрине)
const { data: shops, pending: shopsPending, refresh: refreshShops } = await useAsyncData(
  'admin-shops-list', async () => (FEATURES.b2bStorefront ? await listShops() : []),
)

const view = ref<'apps' | 'shops'>('apps')
const tab = ref<'pending' | 'all'>('pending')
const notes = reactive<Record<string, string>>({})
const slugs = reactive<Record<string, string>>({})
const shares = reactive<Record<string, number>>({})
const busy = ref<string | null>(null)
// claim-ссылки для магазинов, чей владелец ещё не зарегистрирован (по id заявки)
const claimLinks = reactive<Record<string, string>>({})
const site = computed(() => (import.meta.client ? window.location.origin : ''))

async function copyClaim(id: string) {
  try {
    await navigator.clipboard.writeText(claimLinks[id]!)
    toast.add({ title: t('admin.shops.claimCopied'), color: 'success' })
  } catch {
    toast.add({ title: claimLinks[id]!, color: 'info' })
  }
}

// авто-отправка письма-активации владельцу (Tier2 E). Если RESEND-ключ не настроен —
// sent:false, ссылка всё равно показана в UI для ручной отправки.
async function emailClaim(shopId: string) {
  try {
    const r = await $fetch<{ sent: boolean; email?: string }>('/api/admin/shops/send-claim', {
      method: 'POST', body: { shopId },
    })
    if (r.sent) toast.add({ title: t('admin.shops.claimEmailed', { email: r.email }), color: 'success' })
  } catch { /* тихо — ссылка доступна в UI */ }
}

const list = computed(() => {
  const all = apps.value ?? []
  return tab.value === 'pending' ? all.filter(a => a.status === 'pending') : all
})
const pendingCount = computed(() => (apps.value ?? []).filter(a => a.status === 'pending').length)

const greeting = t('admin.shops.greeting')

// reject (и approve без storefront-флага) — просто смена статуса
async function onResolve(id: string, status: 'approved' | 'rejected') {
  busy.value = id
  try {
    await resolve(id, status, notes[id])
    toast.add({ title: status === 'approved' ? t('admin.shops.approved') : t('admin.shops.rejected'), color: 'success' })
    notes[id] = ''
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.shops.error'), description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = null
  }
}

// approve с созданием магазина (когда включён b2bStorefront)
async function onApprove(a: NonNullable<typeof apps.value>[number]) {
  if (!FEATURES.b2bStorefront) { await onResolve(a.id, 'approved'); return }
  const slug = (slugs[a.id] || a.desired_slug || '').trim().toLowerCase()
  if (!slug) { toast.add({ title: t('admin.shops.slugRequired'), color: 'warning' }); return }
  busy.value = a.id
  try {
    const res = await createShop(a.id, slug, a.org_name, Number(shares[a.id] ?? 15))
    // владелец ещё не зарегистрирован → выдаём claim-ссылку для отправки заявителю
    if (res.claim_token) {
      claimLinks[a.id] = `${site.value}/shop-claim/${res.claim_token}`
      toast.add({ title: t('admin.shops.shopCreatedClaim', { slug: res.slug }), color: 'success' })
      await emailClaim(res.id) // best-effort авто-письмо владельцу
    } else {
      toast.add({ title: t('admin.shops.shopCreated', { slug: res.slug }), color: 'success' })
    }
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.shops.error'), description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = null
  }
}

function statusColor(s: string) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning'
}

// ── управление магазинами (Tier1 C) ─────────────────────────────────────────
const shopBusy = ref<string | null>(null)
const shopShare = reactive<Record<string, number>>({})
const shopClaim = reactive<Record<string, string>>({})
type ShopRow = NonNullable<typeof shops.value>[number]

watchEffect(() => {
  for (const s of shops.value ?? []) if (shopShare[s.id] === undefined) shopShare[s.id] = Number(s.revenue_share_pct)
})

const shopsCount = computed(() => (shops.value ?? []).length)

async function toggleShopStatus(s: ShopRow) {
  shopBusy.value = s.id
  try {
    const next = s.status === 'active' ? 'suspended' : 'active'
    await setShopStatus(s.id, next)
    toast.add({ title: next === 'active' ? t('admin.shops.reactivated') : t('admin.shops.suspended'), color: 'success' })
    await refreshShops()
  } catch (e) {
    toast.add({ title: t('admin.shops.error'), description: (e as Error).message, color: 'error' })
  } finally { shopBusy.value = null }
}

async function saveShare(s: ShopRow) {
  const pct = Number(shopShare[s.id])
  if (!(pct >= 0 && pct <= 100)) { toast.add({ title: t('admin.shops.shareInvalid'), color: 'warning' }); return }
  shopBusy.value = s.id
  try {
    await setShopShare(s.id, pct)
    toast.add({ title: t('admin.shops.shareSaved'), color: 'success' })
    await refreshShops()
  } catch (e) {
    toast.add({ title: t('admin.shops.error'), description: (e as Error).message, color: 'error' })
  } finally { shopBusy.value = null }
}

async function onReissue(s: ShopRow) {
  shopBusy.value = s.id
  try {
    const res = await reissueClaim(s.id)
    shopClaim[s.id] = `${site.value}/shop-claim/${res.claim_token}`
    try { await navigator.clipboard.writeText(shopClaim[s.id]!); toast.add({ title: t('admin.shops.claimCopied'), color: 'success' }) }
    catch { toast.add({ title: shopClaim[s.id]!, color: 'info' }) }
    await emailClaim(s.id) // best-effort авто-письмо владельцу
  } catch (e) {
    toast.add({ title: t('admin.shops.error'), description: (e as Error).message, color: 'error' })
  } finally { shopBusy.value = null }
}

async function copyShopClaim(id: string) {
  try { await navigator.clipboard.writeText(shopClaim[id]!); toast.add({ title: t('admin.shops.claimCopied'), color: 'success' }) }
  catch { toast.add({ title: shopClaim[id]!, color: 'info' }) }
}
</script>

<template>
  <div>
    <UiPageHeader
      :label="$t('admin.shops.label')"
      :title="$t('admin.shops.title')"
      :description="$t('admin.shops.description', { n: pendingCount })"
    />

    <!-- переключатель раздела: заявки / созданные магазины -->
    <div class="flex items-center gap-2 mb-6">
      <UButton
        :color="view === 'apps' ? 'primary' : 'neutral'"
        :variant="view === 'apps' ? 'solid' : 'subtle'"
        size="sm"
        icon="i-lucide-inbox"
        @click="view = 'apps'"
      >
        {{ $t('admin.shops.viewApps') }}
        <UBadge v-if="pendingCount" color="neutral" variant="solid" size="sm" class="ml-1">{{ pendingCount }}</UBadge>
      </UButton>
      <UButton
        v-if="FEATURES.b2bStorefront"
        :color="view === 'shops' ? 'primary' : 'neutral'"
        :variant="view === 'shops' ? 'solid' : 'subtle'"
        size="sm"
        icon="i-lucide-store"
        @click="view = 'shops'"
      >
        {{ $t('admin.shops.viewShops') }}
        <UBadge v-if="shopsCount" color="neutral" variant="solid" size="sm" class="ml-1">{{ shopsCount }}</UBadge>
      </UButton>
    </div>

    <template v-if="view === 'apps'">
    <div class="flex items-center gap-2 mb-6">
      <UButton
        :color="tab === 'pending' ? 'primary' : 'neutral'"
        :variant="tab === 'pending' ? 'solid' : 'subtle'"
        size="sm"
        @click="tab = 'pending'"
      >
        {{ $t('admin.shops.tabPending') }}
        <UBadge v-if="pendingCount" color="neutral" variant="solid" size="sm" class="ml-1">{{ pendingCount }}</UBadge>
      </UButton>
      <UButton
        :color="tab === 'all' ? 'primary' : 'neutral'"
        :variant="tab === 'all' ? 'solid' : 'subtle'"
        size="sm"
        @click="tab = 'all'"
      >{{ $t('admin.shops.tabAll') }}</UButton>
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>

    <UiEmptyState
      v-else-if="!list.length"
      icon="i-lucide-store"
      :title="$t('admin.shops.empty.title')"
      :description="$t('admin.shops.empty.description')"
    />

    <div v-else class="space-y-4">
      <div
        v-for="a in list"
        :key="a.id"
        class="rounded-xl border border-ink-gray-200 p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-h3 truncate">{{ a.org_name }}</h3>
              <UBadge :color="statusColor(a.status)" variant="subtle" size="sm">{{ $t(`admin.shops.status.${a.status}`) }}</UBadge>
            </div>
            <p class="text-ink-gray-600 mt-1">{{ a.contact_name }}</p>
            <p v-if="a.desired_slug" class="text-caption text-ink-gray-400 mt-1">
              <UIcon name="i-lucide-globe" class="size-3.5 inline" /> {{ a.desired_slug }}.inkmade.kz
            </p>
          </div>
          <span class="text-caption text-ink-gray-400 shrink-0">{{ formatDate(a.created_at) }}</span>
        </div>

        <div v-if="a.audience || a.comment" class="mt-3 space-y-1">
          <p v-if="a.audience" class="text-caption"><span class="text-ink-gray-400">{{ $t('admin.shops.audience') }}:</span> {{ a.audience }}</p>
          <p v-if="a.comment" class="text-ink-gray-600">{{ a.comment }}</p>
        </div>

        <!-- контакты -->
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="font-mono text-sm text-ink-gray-600">{{ formatKzPhone(a.phone) }}</span>
          <UButton
            v-if="whatsAppLink(a.phone)"
            :to="whatsAppLink(a.phone, greeting)!"
            target="_blank"
            size="xs"
            color="success"
            variant="subtle"
            icon="i-lucide-message-circle"
          >WhatsApp</UButton>
          <UButton v-if="telLink(a.phone)" :to="telLink(a.phone)!" size="xs" color="neutral" variant="ghost" icon="i-lucide-phone">{{ $t('admin.shops.call') }}</UButton>
          <UButton :to="`mailto:${a.email}`" size="xs" color="neutral" variant="ghost" icon="i-lucide-mail">{{ a.email }}</UButton>
        </div>

        <!-- разбор -->
        <div v-if="a.status === 'pending'" class="mt-4 border-t border-ink-gray-200 pt-4 space-y-2">
          <!-- параметры магазина (при включённой витрине) -->
          <div v-if="FEATURES.b2bStorefront" class="flex flex-wrap items-center gap-2">
            <UInput v-model="slugs[a.id]" :placeholder="a.desired_slug || 'slug'" size="sm" class="w-44">
              <template #trailing><span class="text-caption text-ink-gray-400">.inkmade.kz</span></template>
            </UInput>
            <UInput v-model.number="shares[a.id]" type="number" min="0" max="100" placeholder="15" size="sm" class="w-32">
              <template #trailing><span class="text-caption text-ink-gray-400">% {{ $t('admin.shops.share') }}</span></template>
            </UInput>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="notes[a.id]"
              :placeholder="$t('admin.shops.notePlaceholder')"
              size="sm"
              class="flex-1 min-w-48"
            />
            <UButton size="sm" color="success" variant="solid" icon="i-lucide-check" :loading="busy === a.id" @click="onApprove(a)">{{ $t('admin.shops.approve') }}</UButton>
            <UButton size="sm" color="error" variant="subtle" icon="i-lucide-x" :loading="busy === a.id" @click="onResolve(a.id, 'rejected')">{{ $t('admin.shops.reject') }}</UButton>
          </div>
        </div>
        <p v-else-if="a.admin_note" class="mt-3 text-caption text-ink-gray-400">
          <UIcon name="i-lucide-sticky-note" class="size-3.5 inline" /> {{ a.admin_note }}
        </p>

        <!-- claim-ссылка: владелец ещё не зарегистрирован, отправьте её заявителю -->
        <div v-if="claimLinks[a.id]" class="mt-3 rounded-lg bg-ink-cream/50 border border-ink-cream-dark px-3 py-2">
          <p class="text-caption text-ink-gray-600 mb-1">
            <UIcon name="i-lucide-link" class="size-3.5 inline" /> {{ $t('admin.shops.claimHint') }}
          </p>
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono break-all flex-1">{{ claimLinks[a.id] }}</code>
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-copy" @click="copyClaim(a.id)">{{ $t('admin.shops.claimCopy') }}</UButton>
          </div>
        </div>
      </div>
    </div>
    </template>

    <!-- ── управление созданными магазинами (Tier1 C) ── -->
    <template v-else>
      <div v-if="shopsPending" class="py-10 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>

      <UiEmptyState
        v-else-if="!shops?.length"
        icon="i-lucide-store"
        :title="$t('admin.shops.emptyShops.title')"
        :description="$t('admin.shops.emptyShops.description')"
      />

      <div v-else class="space-y-4">
        <div v-for="s in shops" :key="s.id" class="rounded-xl border border-ink-gray-200 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-bold text-h3 truncate">{{ s.name }}</h3>
                <UBadge :color="s.status === 'active' ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ s.status === 'active' ? $t('admin.shops.shopActive') : $t('admin.shops.shopSuspended') }}
                </UBadge>
                <UBadge :color="s.owner_id ? 'info' : 'warning'" variant="subtle" size="sm">
                  {{ s.owner_id ? $t('admin.shops.ownerActive') : $t('admin.shops.ownerPending') }}
                </UBadge>
              </div>
              <p class="text-caption text-ink-gray-400 mt-1">
                <UIcon name="i-lucide-globe" class="size-3.5 inline" /> /s/{{ s.slug }}
                <span v-if="s.claim_email"> · {{ s.claim_email }}</span>
              </p>
            </div>
            <span class="text-caption text-ink-gray-400 shrink-0">{{ formatDate(s.created_at) }}</span>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <UButton size="xs" color="primary" variant="subtle" icon="i-lucide-external-link" :to="`/s/${s.slug}`" target="_blank">{{ $t('admin.shops.openStorefront') }}</UButton>
            <div class="flex items-center gap-1">
              <UInput v-model.number="shopShare[s.id]" type="number" min="0" max="100" size="xs" class="w-24">
                <template #trailing><span class="text-caption text-ink-gray-400">%</span></template>
              </UInput>
              <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-check" :loading="shopBusy === s.id" @click="saveShare(s)">{{ $t('admin.shops.saveShare') }}</UButton>
            </div>
            <UButton
              size="xs"
              :color="s.status === 'active' ? 'error' : 'success'"
              variant="subtle"
              :icon="s.status === 'active' ? 'i-lucide-pause' : 'i-lucide-play'"
              :loading="shopBusy === s.id"
              @click="toggleShopStatus(s)"
            >{{ s.status === 'active' ? $t('admin.shops.suspend') : $t('admin.shops.reactivate') }}</UButton>
            <UButton v-if="!s.owner_id" size="xs" color="neutral" variant="ghost" icon="i-lucide-link" :loading="shopBusy === s.id" @click="onReissue(s)">{{ $t('admin.shops.reissueClaim') }}</UButton>
          </div>

          <div v-if="shopClaim[s.id]" class="mt-3 rounded-lg bg-ink-cream/50 border border-ink-cream-dark px-3 py-2">
            <p class="text-caption text-ink-gray-600 mb-1"><UIcon name="i-lucide-link" class="size-3.5 inline" /> {{ $t('admin.shops.claimHint') }}</p>
            <div class="flex items-center gap-2">
              <code class="text-xs font-mono break-all flex-1">{{ shopClaim[s.id] }}</code>
              <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-copy" @click="copyShopClaim(s.id)">{{ $t('admin.shops.claimCopy') }}</UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
