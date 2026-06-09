import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'

// Импорт гостевых дизайнов в аккаунт (CRM §3.2). Вызывается при входе (плагин)
// или из кастомайзера для вошедшего пользователя. Сохраняет в designs (is_saved=true).
interface IncomingDesign {
  productId?: string
  spec?: Json
  previewUrl?: string | null
  parentId?: string | null
}

const MAX = 20

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{ designs?: IncomingDesign[] }>(event)
  const incoming = (body.designs ?? []).slice(0, MAX)
  if (!incoming.length) return { imported: 0 }

  const svc = serverSupabaseServiceRole<Database>(event)

  // валидация товаров: только существующие активные
  const ids = [...new Set(incoming.map(d => d.productId).filter((x): x is string => !!x))]
  if (!ids.length) return { imported: 0 }
  const { data: products } = await svc.from('products').select('id, is_active').in('id', ids)
  const activeIds = new Set((products ?? []).filter(p => p.is_active).map(p => p.id))

  const rows = incoming
    .filter(d => d.productId && activeIds.has(d.productId) && d.spec)
    .map(d => ({
      user_id: user.id,
      product_id: d.productId!,
      spec: d.spec as Json,
      preview_url: d.previewUrl ?? null,
      parent_design_id: d.parentId ?? null,
      is_saved: true,
    }))
  if (!rows.length) return { imported: 0 }

  const { error } = await svc.from('designs').insert(rows)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Не удалось импортировать дизайны' })

  return { imported: rows.length }
})
