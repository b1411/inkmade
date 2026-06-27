// Централизованное структурное логирование серверных ошибок (observability).
// Раньше падения webhook / apply_paid и сбои уведомлений уходили в bare console.error
// (или глотались вовсе) — в проде их было не видно. Теперь:
//   1) всегда пишем структурный JSON-лог (его подхватит любой агрегатор Vercel/CloudWatch);
//   2) если задан ERROR_WEBHOOK_URL — дополнительно шлём краткое уведомление (Slack/Discord/
//      любой incoming webhook). Без переменной — просто no-op пересылки (DSN-gated).
//
// Не тянем тяжёлый SDK: для текущего масштаба структурный лог + webhook достаточно;
// миграция на Sentry позже сведётся к замене тела sinkExternal().

interface ErrorMeta {
  [key: string]: unknown
}

function serializeError(err: unknown): { name?: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { message: typeof err === 'string' ? err : JSON.stringify(err) }
}

async function sinkExternal(context: string, err: ReturnType<typeof serializeError>, meta?: ErrorMeta) {
  const url = process.env.ERROR_WEBHOOK_URL
  if (!url) return
  try {
    await $fetch(url, {
      method: 'POST',
      body: {
        text: `🔴 INKMADE [${context}]: ${err.message}`,
        context,
        error: err,
        meta,
      },
    })
  } catch {
    // пересылка best-effort: её сбой не должен ломать обработку запроса
  }
}

/**
 * Залогировать серверную ошибку структурно + (опц.) переслать на ERROR_WEBHOOK_URL.
 * @param context короткий ярлык места (например 'payment/webhook', 'notifyOrder')
 */
export async function logError(context: string, err: unknown, meta?: ErrorMeta): Promise<void> {
  const serialized = serializeError(err)
  // структурный лог — одной строкой JSON для агрегатора
  console.error(JSON.stringify({ level: 'error', context, ...serialized, meta }))
  await sinkExternal(context, serialized, meta)
}
