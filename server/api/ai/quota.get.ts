import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { FEATURES } from '~~/shared/config/features'

// Остаток месячной квоты AI-генераций для текущего пользователя (для UI-индикатора).

function monthKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  if (!FEATURES.aiDesign) throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const cfg = useRuntimeConfig(event)
  const svc = serverSupabaseServiceRole<Database>(event)
  const month = monthKey()

  // строки может не быть (генераций в этом месяце ещё не было) — тогда лимит из конфига
  const { data: q } = await svc.from('ai_quotas')
    .select('used_count, max_uses').eq('user_id', user.id).eq('month_year', month).single()

  const used = q?.used_count ?? 0
  const maxUses = q?.max_uses ?? cfg.aiMonthlyQuota
  return { used, max: maxUses, remaining: Math.max(0, maxUses - used) }
})
