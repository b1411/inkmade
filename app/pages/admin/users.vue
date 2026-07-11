<script setup lang="ts">
import type { UserRole } from '~/types/models'

// Пользователи и роли (§8.1). Только admin. Роль определяет доступ к кабинетам.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
useHead({ title: t('admin.users.headTitle') })

const { listUsers, setUserRole, setUserBanned, inviteUser } = useUsers()
const me = useSupabaseUser()
const toast = useToast()

const { data: users, refresh, pending } = await useAsyncData('admin-users', () => listUsers())

const ROLES = computed<{ label: string; value: UserRole }[]>(() => [
  { label: t('admin.users.roles.customer'), value: 'customer' },
  { label: t('admin.users.roles.operator'), value: 'operator' },
  { label: t('admin.users.roles.admin'), value: 'admin' },
])
const roleLabel = (r: string) => ROLES.value.find(x => x.value === r)?.label ?? r

// локальный выбор роли по каждому пользователю (до сохранения)
const draft = reactive<Record<string, UserRole>>({})
watchEffect(() => {
  for (const u of users.value ?? []) if (!(u.id in draft)) draft[u.id] = u.role as UserRole
})

const savingId = ref<string | null>(null)
const { confirm } = useConfirm()
async function save(userId: string) {
  const u = users.value?.find(x => x.id === userId)
  // выдача роли admin — полный доступ ко всему: требуем явного подтверждения
  if (draft[userId] === 'admin' && u?.role !== 'admin') {
    const ok = await confirm({ title: t('admin.users.grantAdminConfirm', { email: u?.email ?? '' }), confirmLabel: t('admin.users.roles.admin'), tone: 'danger' })
    if (!ok) return
  }
  savingId.value = userId
  try {
    await setUserRole(userId, draft[userId]!)
    toast.add({ title: t('admin.users.roleUpdated'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.users.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    savingId.value = null
  }
}
const changed = (u: { id: string; role: string }) => draft[u.id] !== u.role

const isBanned = (u: { banned_until?: string | null }) =>
  !!u.banned_until && new Date(u.banned_until).getTime() > Date.now()

// ── Блокировка/разблокировка ─────────────────────────────────────
const banningId = ref<string | null>(null)
async function toggleBan(u: { id: string; email: string; banned_until?: string | null }) {
  const ban = !isBanned(u)
  if (ban) {
    const ok = await confirm({ title: t('admin.users.banConfirm', { email: u.email }), tone: 'danger' })
    if (!ok) return
  }
  banningId.value = u.id
  try {
    await setUserBanned(u.id, ban)
    toast.add({ title: ban ? t('admin.users.banToast') : t('admin.users.unbanToast'), color: ban ? 'warning' : 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.users.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    banningId.value = null
  }
}

// ── Приглашение пользователя ─────────────────────────────────────
const invite = reactive({ email: '', role: 'customer' as UserRole })
const inviting = ref(false)
async function sendInvite() {
  if (!invite.email.trim()) return
  inviting.value = true
  try {
    await inviteUser(invite.email.trim(), invite.role)
    toast.add({ title: t('admin.users.invite.sent'), color: 'success' })
    invite.email = ''
    invite.role = 'customer'
    await refresh()
  } catch (e) {
    toast.add({ title: t('admin.users.invite.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      :label="$t('admin.users.label')"
      :title="$t('admin.users.title')"
      :description="$t('admin.users.description')"
    />

    <!-- Приглашение нового пользователя -->
    <UiPanel :title="$t('admin.users.invite.title')" icon="i-lucide-user-plus" class="mb-6">
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="sendInvite">
        <UFormField :label="$t('admin.users.invite.email')" class="flex-1 min-w-56">
          <UInput v-model="invite.email" type="email" :placeholder="$t('admin.users.invite.emailPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('admin.users.invite.role')">
          <USelect v-model="invite.role" :items="ROLES" value-key="value" class="w-48" />
        </UFormField>
        <UButton type="submit" color="primary" icon="i-lucide-send" :loading="inviting" :disabled="!invite.email.trim()">
          {{ $t('admin.users.invite.submit') }}
        </UButton>
      </form>
      <p class="text-caption text-ink-gray-400 mt-3">{{ $t('admin.users.invite.note') }}</p>
    </UiPanel>

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <UiPanel v-else :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="px-6 py-3">{{ $t('admin.users.table.email') }}</th>
              <th class="px-6 py-3">{{ $t('admin.users.table.name') }}</th>
              <th class="px-6 py-3">{{ $t('admin.users.table.role') }}</th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b border-ink-gray-200 last:border-b-0" :class="isBanned(u) && 'bg-ink-error/5'">
              <td class="px-6 py-3">
                {{ u.email }}
                <UBadge v-if="u.id === me?.id" color="primary" variant="subtle" size="sm" class="ml-1">{{ $t('admin.users.you') }}</UBadge>
                <UBadge v-if="isBanned(u)" color="error" variant="subtle" size="sm" class="ml-1">{{ $t('admin.users.banned') }}</UBadge>
              </td>
              <td class="px-6 py-3">{{ u.full_name ?? '—' }}</td>
              <td class="px-6 py-3">
                <USelect
                  v-if="u.id !== me?.id"
                  v-model="draft[u.id]"
                  :items="ROLES"
                  value-key="value"
                  class="w-56"
                />
                <span v-else class="text-ink-gray-600">{{ roleLabel(u.role) }}</span>
              </td>
              <td class="px-6 py-3 text-right whitespace-nowrap">
                <template v-if="u.id !== me?.id">
                  <UButton
                    size="sm"
                    color="primary"
                    variant="subtle"
                    :disabled="!changed(u)"
                    :loading="savingId === u.id"
                    @click="save(u.id)"
                  >{{ $t('actions.save') }}</UButton>
                  <UButton
                    v-if="u.role !== 'admin'"
                    class="ml-2"
                    size="sm"
                    :color="isBanned(u) ? 'success' : 'error'"
                    variant="ghost"
                    :icon="isBanned(u) ? 'i-lucide-unlock' : 'i-lucide-ban'"
                    :loading="banningId === u.id"
                    @click="toggleBan(u)"
                  >{{ isBanned(u) ? $t('admin.users.unban') : $t('admin.users.ban') }}</UButton>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiPanel>

    <p class="text-caption text-ink-gray-400 mt-4">
      {{ $t('admin.users.note') }}
    </p>
  </div>
</template>
