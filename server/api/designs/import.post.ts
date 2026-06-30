import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'
import { designImportSchema, parseOrThrow } from '~~/server/utils/schemas'

// Импорт гостевых дизайнов в аккаунт (CRM §3.2). Вызывается при входе (плагин)
// или из кастомайзера для вошедшего пользователя. Сохраняет в designs (is_saved=true).

const MAX = 20

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = parseOrThrow(designImportSchema, await readBody(event))
  const incoming = (body.designs ?? []).slice(0, MAX)
  if (!incoming.length) return { imported: 0 }

  const svc = serverSupabaseServiceRole<Database>(event)

  // валидация товаров: только существующие активные
  const ids = [...new Set(incoming.map(d => d.productId).filter((x): x is string => !!x))]
  if (!ids.length) return { imported: 0 }
  const { data: products } = await svc.from('products').select('id, is_active').in('id', ids)
  const activeIds = new Set((products ?? []).filter(p => p.is_active).map(p => p.id))

  // parent_design_id обязан принадлежать ТЕКУЩЕМУ пользователю — иначе привязка к чужому
  // дизайну (IDOR через service role в обход RLS). Неподтверждённые parentId обнуляем.
  const parentIds = [...new Set(incoming.map(d => d.parentId).filter((x): x is string => !!x))]
  let ownParents = new Set<string>()
  if (parentIds.length) {
    const { data: parents } = await svc.from('designs').select('id').in('id', parentIds).eq('user_id', user.id)
    ownParents = new Set((parents ?? []).map(p => p.id))
  }

  // previewUrl обязан вести в НАШ публичный Storage (anti-SSRF/фишинг при показе в галерее/
  // CRM-карточке), как в orders/create. Чужой/внешний URL отбрасываем (best-effort, не валим импорт).
  const cfg = useRuntimeConfig(event)
  const supaUrl = String((cfg.public as { supabase?: { url?: string } })?.supabase?.url || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const storagePrefix = supaUrl ? `${supaUrl}/storage/v1/object/public/` : ''
  const ownStorageUrl = (url: string | null | undefined): boolean =>
    !url || (!!storagePrefix && url.startsWith(storagePrefix))

  const rows = incoming
    .filter(d => d.productId && activeIds.has(d.productId) && d.spec)
    .map(d => ({
      user_id: user.id,
      product_id: d.productId!,
      spec: d.spec as Json,
      preview_url: ownStorageUrl(d.previewUrl) ? (d.previewUrl ?? null) : null,
      parent_design_id: (d.parentId && ownParents.has(d.parentId)) ? d.parentId : null,
      is_saved: true,
    }))
  if (!rows.length) return { imported: 0 }

  const { error } = await svc.from('designs').insert(rows)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Не удалось импортировать дизайны' })

  return { imported: rows.length }
})
