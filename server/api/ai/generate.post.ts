import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { FEATURES } from '~~/shared/config/features'
import { aiPrintGenerateSchema, parseOrThrow } from '~~/server/utils/schemas'
import { getAiImageProvider, buildPrintPrompt } from '~~/server/utils/ai-image'
import { uploadAiImage } from '~~/server/utils/ai-image-storage'

// AI-генерация принта (§AI). Инварианты: фича за флагом, только вошедшим, месячная квота
// (биллинг провайдера идёт с нас), журнал генераций, результат — в НАШ Storage (SSRF-гард).

// стоп-фильтр явно запрещённого (бренды/NSFW/насилие). Поверх — встроенная модерация провайдера.
const BANNED = ['nsfw', 'porn', 'porno', 'nude', 'naked', 'explicit', 'gore', 'nazi', 'swastika', 'порно', 'насилие', 'нацист']

function monthKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  if (!FEATURES.aiDesign) throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = parseOrThrow(aiPrintGenerateSchema, await readBody(event))

  const lower = body.prompt.toLowerCase()
  if (BANNED.some(w => lower.includes(w))) {
    throw createError({ statusCode: 400, statusMessage: 'Запрос отклонён модерацией' })
  }

  const cfg = useRuntimeConfig(event)
  if (!cfg.aiImageApiKey) throw createError({ statusCode: 503, statusMessage: 'AI-генерация временно недоступна' })

  const svc = serverSupabaseServiceRole<Database>(event)
  const month = monthKey()

  // квота: атомарно списываем одну генерацию в пределах месячного лимита
  const { data: allowed, error: qErr } = await svc.rpc('bump_ai_quota', {
    p_user_id: user.id,
    p_month: month,
    p_max: cfg.aiMonthlyQuota,
  })
  if (qErr) throw createError({ statusCode: 500, statusMessage: 'Ошибка учёта квоты' })
  if (!allowed) throw createError({ statusCode: 429, statusMessage: 'Лимит генераций на этот месяц исчерпан' })

  // журналируем попытку (pending) — аудит и материал для будущей галереи/модерации
  const { data: gen } = await svc.from('ai_generations')
    .insert({ user_id: user.id, prompt: body.prompt, style: body.style ?? null, status: 'pending' })
    .select('id').single()
  const genId = gen?.id ?? null

  // Генерация у провайдера: при провале биллинг чаще всего не списан → возвращаем квоту.
  let result: Awaited<ReturnType<ReturnType<typeof getAiImageProvider>['generate']>>
  try {
    const provider = getAiImageProvider()
    const finalPrompt = buildPrintPrompt(body.prompt, body.style)
    result = await provider.generate(finalPrompt, body.aspect ?? 'square')
  } catch (e) {
    await svc.rpc('refund_ai_quota', { p_user_id: user.id, p_month: month })
    if (genId) {
      await svc.from('ai_generations')
        .update({ status: 'failed', error_message: (e as Error).message?.slice(0, 500) ?? 'error' })
        .eq('id', genId)
    }
    throw createError({ statusCode: 502, statusMessage: 'Не удалось сгенерировать изображение, попробуйте ещё раз' })
  }

  // Сохранение в наш Storage: генерация УЖЕ удалась (биллинг провайдера списан с нас),
  // поэтому при сбое сохранения квоту НЕ возвращаем — иначе бесплатная перегенерация
  // за наш счёт. Фиксируем сбой и просим обратиться в поддержку.
  try {
    const imageUrl = await uploadAiImage(event, result.buffer, result.contentType, user.id)

    if (genId) {
      await svc.from('ai_generations').update({ status: 'completed', image_url: imageUrl }).eq('id', genId)
    }

    // остаток квоты для отображения в UI
    const { data: q } = await svc.from('ai_quotas')
      .select('used_count, max_uses').eq('user_id', user.id).eq('month_year', month).single()
    const remaining = q ? Math.max(0, q.max_uses - q.used_count) : 0

    return { imageUrl, width: result.w, height: result.h, generationId: genId, remaining }
  } catch (e) {
    if (genId) {
      await svc.from('ai_generations')
        .update({ status: 'failed', error_message: (e as Error).message?.slice(0, 500) ?? 'error' })
        .eq('id', genId)
    }
    throw createError({ statusCode: 500, statusMessage: 'Изображение сгенерировано, но не сохранилось — обратитесь в поддержку' })
  }
})
