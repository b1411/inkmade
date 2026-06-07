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
    <div class="mb-6">
      <UiSectionLabel accent>Доступ</UiSectionLabel>
      <h1 class="ink-display text-2xl mt-2">Пользователи и роли</h1>
      <p class="text-caption text-ink-gray-600 mt-1">
        Оператор видит производственный кабинет /studio, администратор — этот раздел /admin.
      </p>
    </div>

    <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>

    <table v-else class="w-full text-left border-collapse">
      <thead>
        <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
          <th class="py-2 pr-4">Email</th>
          <th class="py-2 pr-4">Имя</th>
          <th class="py-2 pr-4">Роль</th>
          <th class="py-2" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-b border-ink-gray-200">
          <td class="py-3 pr-4">
            {{ u.email }}
            <UBadge v-if="u.id === me?.id" color="primary" variant="subtle" size="sm" class="ml-1">вы</UBadge>
          </td>
          <td class="py-3 pr-4">{{ u.full_name ?? '—' }}</td>
          <td class="py-3 pr-4">
            <USelect
              v-if="u.id !== me?.id"
              v-model="draft[u.id]"
              :items="ROLES"
              value-key="value"
              class="w-56"
            />
            <span v-else class="text-ink-gray-600">{{ roleLabel(u.role) }}</span>
          </td>
          <td class="py-3 text-right">
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

    <p class="text-caption text-ink-gray-400 mt-4">
      Свою роль изменить нельзя — это защита от случайной потери доступа администратором.
    </p>
  </div>
</template>
