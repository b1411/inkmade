import type { Database } from '~/types/database.types'

// B2B-магазины, Фаза B1 (docs/B2B_SHOPS_PLAN.md). Подача заявки с публичной формы
// (через server-API на service-role) + разбор очереди заявок в админке.
export interface ShopApplicationInput {
  orgName: string
  contactName: string
  phone: string
  email: string
  desiredSlug?: string
  audience?: string
  comment?: string
}

export const useBusiness = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  // публичная подача заявки — идёт через server-API (RLS запрещает прямую вставку)
  async function apply(input: ShopApplicationInput) {
    return await $fetch<{ ok: true }>('/api/business/apply', {
      method: 'POST',
      body: {
        orgName: input.orgName,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email,
        desiredSlug: input.desiredSlug ?? '',
        audience: input.audience ?? '',
        comment: input.comment ?? '',
      },
    })
  }

  // админ: список заявок (RLS staff read)
  async function listApplications() {
    const { data, error } = await supabase
      .from('shop_applications')
      .select('id, org_name, contact_name, phone, email, desired_slug, audience, comment, status, admin_note, created_at, resolved_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  // админ: решение по заявке. .eq('status','pending') — оптимистичный guard от двойного разбора.
  async function resolve(id: string, status: 'approved' | 'rejected', note?: string) {
    const { error } = await supabase
      .from('shop_applications')
      .update({
        status,
        admin_note: note?.trim() || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user.value?.id ?? null,
      })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) throw error
  }

  return { apply, listApplications, resolve }
}
