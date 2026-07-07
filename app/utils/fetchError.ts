// Достаёт человекочитаемое сообщение из ошибки $fetch (Nuxt/ofetch FetchError).
// У FetchError `.message` = технический «[POST] "/api/...": 409 Conflict», а
// дружелюбный текст сервера (createError → statusMessage) лежит в `.data.statusMessage`.
// Плейн-Error и прочее деградируют до `.message`, затем до fallback.
export interface ApiErrorShape {
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: { statusMessage?: string; message?: string }
}

export function getFetchMessage(e: unknown, fallback = ''): string {
  const err = e as ApiErrorShape | null
  return (
    err?.data?.statusMessage ||
    err?.data?.message ||
    err?.statusMessage ||
    err?.message ||
    fallback
  )
}

export function getFetchStatus(e: unknown): number | undefined {
  return (e as ApiErrorShape | null)?.statusCode
}
