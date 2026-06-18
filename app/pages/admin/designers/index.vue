<script setup lang="ts">
// Дизайнеры CRM (§6.3): список, очередь модерации принтов, выплаты.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const fin = useFinance()
const toast = useToast()

const { data, refresh, pending } = await useAsyncData('admin-designers', async () => {
  const [designers, queue, payouts, invites] = await Promise.all([
    fin.designers(), fin.moderationQueue(), fin.payouts('requested'), fin.invitations(),
  ])
  return { designers, queue, payouts, invites }
})

const money = (n: number) => `${Math.round(n).toLocaleString('ru')} ₸`

// приглашения дизайнеров (§7.5)
const invite = reactive({ email: '', royalty: 20, note: '' })
const inviting = ref(false)
const site = computed(() => import.meta.client ? window.location.origin : '')
function inviteLink(token: string) { return `${site.value}/invite/${token}` }

async function sendInvite() {
  if (!invite.email.trim()) { toast.add({ title: t('admin.designers.enterEmail'), color: 'warning' }); return }
  inviting.value = true
  try {
    await fin.createInvite(invite.email.trim(), invite.royalty, invite.note.trim() || undefined)
    Object.assign(invite, { email: '', royalty: 20, note: '' })
    await refresh()
    toast.add({ title: t('admin.designers.inviteCreated'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.designers.error'), description: (e as Error).message, color: 'error' })
  } finally { inviting.value = false }
}
async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(inviteLink(token))
    toast.add({ title: t('admin.designers.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: inviteLink(token), color: 'info' })
  }
}
async function revoke(id: string) {
  try { await fin.revokeInvite(id); await refresh() }
  catch (e) { toast.add({ title: t('admin.designers.error'), description: (e as Error).message, color: 'error' }) }
}
const inviteBadge = (s: string) => s === 'joined' ? 'success' : s === 'revoked' ? 'error' : 'warning'
const inviteLabel = computed<Record<string, string>>(() => ({
  invited: t('admin.designers.statusInvited'),
  joined: t('admin.designers.statusJoined'),
  revoked: t('admin.designers.statusRevoked'),
}))

const busy = ref<string | null>(null)
async function moderate(id: string, status: 'approved' | 'rejected') {
  busy.value = id
  try {
    let note: string | undefined
    if (status === 'rejected') { note = window.prompt(t('admin.designers.rejectReason')) ?? undefined }
    await fin.moderatePrint(id, status, note)
    await refresh()
    toast.add({ title: status === 'approved' ? t('admin.designers.printApproved') : t('admin.designers.printRejected'), color: status === 'approved' ? 'success' : 'warning' })
  } catch (e) {
    toast.add({ title: t('admin.designers.error'), description: (e as Error).message, color: 'error' })
  } finally { busy.value = null }
}
async function payout(id: string) {
  busy.value = id
  try {
    await fin.markPaid(id)
    await refresh()
    toast.add({ title: t('admin.designers.payoutMarked'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.designers.error'), description: (e as Error).message, color: 'error' })
  } finally { busy.value = null }
}
</script>

<template>
  <div class="space-y-8">
    <UiPageHeader :label="$t('admin.designers.label')" :title="$t('admin.designers.title')" :description="$t('admin.designers.description')" />

    <div v-if="pending" class="space-y-2">
      <UiSkeleton v-for="n in 4" :key="n" rounded="rounded-lg" class="h-20" />
    </div>
    <template v-else>
      <!-- очередь модерации -->
      <UiPanel v-if="data?.queue?.length" :title="$t('admin.designers.queueTitle', { count: data.queue.length })">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div v-for="p in data.queue" :key="p.id" class="border border-ink-warning/40 rounded-lg overflow-hidden">
            <div class="aspect-square bg-ink-gray-200"><img v-if="p.thumbnail_url" :src="p.thumbnail_url" :alt="p.title" class="w-full h-full object-contain"></div>
            <div class="p-2 space-y-1">
              <p class="text-caption font-semibold truncate">{{ p.title }}</p>
              <div class="flex gap-1">
                <UButton size="xs" color="success" variant="subtle" icon="i-lucide-check" :loading="busy === p.id" @click="moderate(p.id, 'approved')" />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" :loading="busy === p.id" @click="moderate(p.id, 'rejected')" />
              </div>
            </div>
          </div>
        </div>
      </UiPanel>

      <!-- заявки на выплату -->
      <UiPanel v-if="data?.payouts?.length" :title="$t('admin.designers.payoutsTitle', { count: data.payouts.length })" :padded="false">
        <div class="divide-y divide-ink-gray-200 text-caption">
          <div v-for="p in data.payouts" :key="p.id" class="flex items-center justify-between px-6 py-3">
            <span>{{ new Date(p.requested_at).toLocaleDateString('ru') }}</span>
            <span class="font-semibold">{{ money(Number(p.amount)) }}</span>
            <UButton size="xs" color="primary" variant="subtle" :loading="busy === p.id" @click="payout(p.id)">{{ $t('admin.designers.markPaid') }}</UButton>
          </div>
        </div>
      </UiPanel>

      <!-- приглашения дизайнеров (закрытый старт §7.5) -->
      <UiPanel :title="$t('admin.designers.invitesTitle')">
        <div class="grid lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <UiEmptyState v-if="!data?.invites?.length" icon="i-lucide-mail" :title="$t('admin.designers.invitesEmptyTitle')" :text="$t('admin.designers.invitesEmptyText')" />
            <table v-else class="w-full text-caption">
              <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
                <th class="text-left py-2">{{ $t('admin.designers.colEmail') }}</th><th class="text-right">{{ $t('admin.designers.colRate') }}</th><th class="text-left pl-3">{{ $t('admin.designers.colStatus') }}</th><th></th>
              </tr></thead>
              <tbody>
                <tr v-for="inv in data.invites" :key="inv.id" class="border-b border-ink-gray-200/60">
                  <td class="py-2">{{ inv.email }}<span v-if="inv.note" class="block text-ink-gray-500">{{ inv.note }}</span></td>
                  <td class="text-right">{{ inv.royalty_pct }}%</td>
                  <td class="pl-3"><UBadge :color="inviteBadge(inv.status)" variant="subtle" size="xs">{{ inviteLabel[inv.status] }}</UBadge></td>
                  <td class="text-right whitespace-nowrap">
                    <UButton v-if="inv.status === 'invited'" size="xs" color="neutral" variant="ghost" icon="i-lucide-link" @click="copyLink(inv.token)">{{ $t('admin.designers.inviteLink') }}</UButton>
                    <UButton v-if="inv.status === 'invited'" size="xs" color="error" variant="ghost" icon="i-lucide-x" @click="revoke(inv.id)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border border-ink-gray-200 rounded-lg p-4 h-fit space-y-3">
            <UiSectionLabel>{{ $t('admin.designers.inviteDesigner') }}</UiSectionLabel>
            <UFormField :label="$t('admin.designers.fieldEmail')"><UInput v-model="invite.email" type="email" :placeholder="$t('admin.designers.emailPlaceholder')" class="w-full" /></UFormField>
            <UFormField :label="$t('admin.designers.fieldRoyalty')"><UInput v-model.number="invite.royalty" type="number" class="w-full" /></UFormField>
            <UFormField :label="$t('admin.designers.fieldNote')"><UInput v-model="invite.note" :placeholder="$t('admin.designers.notePlaceholder')" class="w-full" /></UFormField>
            <UButton color="primary" block icon="i-lucide-user-plus" :loading="inviting" @click="sendInvite">{{ $t('admin.designers.createInvite') }}</UButton>
            <p class="text-caption text-ink-gray-500">{{ $t('admin.designers.inviteHint') }}</p>
          </div>
        </div>
      </UiPanel>

      <!-- список дизайнеров -->
      <UiPanel :title="$t('admin.designers.allDesignersTitle')" :padded="false">
        <UiEmptyState v-if="!data?.designers?.length" icon="i-lucide-users" :title="$t('admin.designers.designersEmptyTitle')" :text="$t('admin.designers.designersEmptyText')" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-caption">
            <thead class="ink-label text-ink-gray-500"><tr class="border-b border-ink-gray-200">
              <th class="text-left px-6 py-3">{{ $t('admin.designers.colNickname') }}</th><th class="text-left px-6 py-3">{{ $t('admin.designers.colStatus') }}</th><th class="text-right px-6 py-3">{{ $t('admin.designers.colRate') }}</th>
              <th class="text-right px-6 py-3">{{ $t('admin.designers.colEarned') }}</th><th class="text-right px-6 py-3">{{ $t('admin.designers.colToPay') }}</th><th class="px-6 py-3"></th>
            </tr></thead>
            <tbody>
              <tr v-for="d in data.designers" :key="d.id" class="border-b border-ink-gray-200/60">
                <td class="px-6 py-3 font-semibold">{{ d.display_name || '—' }}</td>
                <td class="px-6 py-3"><UBadge :color="d.status === 'active' ? 'success' : 'neutral'" variant="subtle" size="xs">{{ d.status }}</UBadge></td>
                <td class="text-right px-6 py-3">{{ d.royalty_pct }}%</td>
                <td class="text-right px-6 py-3">{{ money(d.total_earned) }}</td>
                <td class="text-right px-6 py-3 font-semibold text-ink-burgundy">{{ money(d.available) }}</td>
                <td class="text-right px-6 py-3"><UButton :to="`/admin/designers/${d.id}`" size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-right" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiPanel>
    </template>
  </div>
</template>
