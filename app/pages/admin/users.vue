<script setup lang="ts">
import type { UserRole } from '~/types/models'

// Пользователи и роли (§8.1). Только admin. Роль определяет доступ к кабинетам.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
useHead({ title: 'Пользователи — INKMADE' })

const { listUsers, setUserRole } = useUsers()
const me = useSupabaseUser()
const toast = useToast()

const { data: users, refresh, pending } = await useAsyncData('admin-users', () => listUsers())

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Покупатель', value: 'customer' },
  { label: 'Оператор (производство)', value: 'operator' },
  { label: 'Администратор', value: 'admin' },
]
const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r

// локальный выбор роли по каждому пользователю (до сохранения)
const draft = reactive<Record<string, UserRole>>({})
watchEffect(() => {
  for (const u of users.value ?? []) if (!(u.id in draft)) draft[u.id] = u.role as UserRole
})

const savingId = ref<string | null>(null)
async function save(userId: string) {
  savingId.value = userId
  try {
    await setUserRole(userId, draft[userId]!)
    toast.add({ title: 'Роль обновлена', color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    savingId.value = null
  }
}
const changed = (u: { id: string; role: string }) => draft[u.id] !== u.role
</script>

<template>
  <div>
    <UiPageHeader
      label="Доступ"
      title="Пользователи и роли"
      description="Оператор видит производственный кабинет /studio, администратор — этот раздел /admin."
    />

    <div v-if="pending" class="space-y-3">
      <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-12" />
    </div>

    <UiPanel v-else :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="px-6 py-3">Email</th>
              <th class="px-6 py-3">Имя</th>
              <th class="px-6 py-3">Роль</th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b border-ink-gray-200 last:border-b-0">
              <td class="px-6 py-3">
                {{ u.email }}
                <UBadge v-if="u.id === me?.id" color="primary" variant="subtle" size="sm" class="ml-1">вы</UBadge>
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
              <td class="px-6 py-3 text-right">
                <UButton
                  v-if="u.id !== me?.id"
                  size="sm"
                  color="primary"
                  variant="subtle"
                  :disabled="!changed(u)"
                  :loading="savingId === u.id"
                  @click="save(u.id)"
                >Сохранить</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiPanel>

    <p class="text-caption text-ink-gray-400 mt-4">
      Свою роль изменить нельзя — это защита от случайной потери доступа администратором.
    </p>
  </div>
</template>
