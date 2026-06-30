// AI-генерация принтов (§AI) — клиентский слой над /api/ai/*. Состояние квоты общее
// (useState), чтобы индикатор остатка был консистентен между перерисовками панели.

export interface AiQuota { used: number; max: number; remaining: number }
export interface AiGenerateResult {
  imageUrl: string
  width: number
  height: number
  generationId: string | null
  remaining: number
}

export const useAiDesign = () => {
  const quota = useState<AiQuota | null>('ai_quota', () => null)

  async function loadQuota() {
    try { quota.value = await $fetch<AiQuota>('/api/ai/quota') }
    catch { quota.value = null }
  }

  async function generate(
    prompt: string,
    style?: string,
    aspect?: 'square' | 'portrait' | 'landscape',
  ): Promise<AiGenerateResult> {
    const res = await $fetch<AiGenerateResult>('/api/ai/generate', {
      method: 'POST',
      body: { prompt, style, aspect },
    })
    // синхронизируем индикатор остатка из ответа сервера
    if (quota.value) quota.value = { ...quota.value, used: quota.value.max - res.remaining, remaining: res.remaining }
    return res
  }

  return { quota, loadQuota, generate }
}
