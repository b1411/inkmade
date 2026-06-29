import type { Database } from '~/types/database.types'
import type { UserRole } from '~/types/models'

// Управление пользователями и ролями (§8.1, §17.3). Только admin.
// Список — через RPC (email в auth.users). Смена роли — UPDATE profiles
// (политика profiles_admin_all); сам себе роль сменить нельзя (profiles_update_self).
export const useUsers = () => {
  const supabase = useSupabaseClient<Database>()

  async function listUsers() {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) throw error
    return data
  }

  async function setUserRole(userId: string, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) throw error
    // при назначении дизайнера — заводим его профиль (если ещё нет), чтобы кабинет работал
    if (role === 'designer') {
      await supabase.from('designer_profiles')
        .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })
    }
  }

  // Блокировка/разблокировка и приглашение требуют service-role (Auth Admin API),
  // поэтому идут через серверные эндпоинты, которые перепроверяют роль admin.
  async function setUserBanned(userId: string, ban: boolean) {
    await $fetch('/api/admin/users/ban', { method: 'POST', body: { userId, ban } })
  }

  async function inviteUser(email: string, role: UserRole = 'customer') {
    await $fetch('/api/admin/users/invite', { method: 'POST', body: { email, role } })
  }

  return { listUsers, setUserRole, setUserBanned, inviteUser }
}
