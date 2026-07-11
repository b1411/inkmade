import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Health/readiness-проба для аптайм-мониторинга (ops). Публичная, без секретов.
// Живёт вне /api, поэтому не попадает под rate-limit при частом опросе.
//   • liveness (по умолчанию): 200, если процесс отвечает.
//   • readiness (?deep=1): дополнительно лёгкий пинг БД; при недоступности → 503.
export default defineEventHandler(async (event) => {
  const deep = getQuery(event).deep != null
  const base = {
    status: 'ok' as 'ok' | 'degraded',
    uptime: typeof process !== 'undefined' ? Math.round(process.uptime()) : undefined,
    timestamp: new Date().toISOString(),
  }
  if (!deep) return base

  let db: 'ok' | 'error' = 'ok'
  try {
    const svc = serverSupabaseServiceRole<Database>(event)
    // HEAD-запрос с count: данные не тянем, только проверяем доступность БД
    const { error } = await svc.from('categories').select('id', { head: true, count: 'exact' }).limit(1)
    if (error) db = 'error'
  } catch { db = 'error' }

  if (db === 'error') {
    setResponseStatus(event, 503)
    return { ...base, status: 'degraded', db }
  }
  return { ...base, db }
})
