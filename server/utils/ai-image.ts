// Абстракция AI-провайдера генерации изображений (§AI). По образцу server/utils/payment.ts:
// на старте — fal.ai / Ideogram V3 (лучший рендер текста на мерче + прозрачный PNG).
// Смена на Recraft/Flux = другая реализация этого же интерфейса (выбор по runtimeConfig),
// UI и конструктор не меняются.

export type AiAspect = 'square' | 'portrait' | 'landscape'

export interface AiImageResult {
  buffer: Buffer
  contentType: string
  w: number
  h: number
}

export interface AiImageProvider {
  name: string
  generate(prompt: string, aspect: AiAspect): Promise<AiImageResult>
}

// негатив-промпт: гоним прочь фотомокапы/людей/водяные знаки — нужен чистый принт под печать
const NEGATIVE =
  'photo, photograph, realistic photo, mockup, t-shirt mockup, person, model wearing, hands, watermark, signature, low quality, blurry, jpeg artifacts, frame, border'

// статическая «обёртка» под мерч (без Claude): усиливает пригодность к печати.
// Ключи синхронны с aiStyles в server/utils/schemas.ts и пресетами в AIGenerator.vue.
const STYLE_KEYWORDS: Record<string, string> = {
  minimal: 'minimalist, flat, simple shapes, limited palette',
  vintage: 'vintage, retro, distressed texture, 80s 90s aesthetic',
  lettering: 'bold typography, hand lettering, slogan, clean readable text',
  street: 'streetwear, graffiti, urban, bold contrast',
  anime: 'anime style, manga, cel shading, vibrant',
  ornament: 'kazakh national ornament, traditional central asian pattern, symmetrical, decorative',
}

/** Собрать печатный промпт: текст пользователя + стиль + статичный merch-суффикс. */
export function buildPrintPrompt(userPrompt: string, style?: string): string {
  const extra = style && STYLE_KEYWORDS[style] ? `, ${STYLE_KEYWORDS[style]}` : ''
  return `${userPrompt}${extra}, t-shirt print design, bold, high detail, centered, isolated subject on plain solid background, sticker style, vector art`
}

function imageSizeFor(aspect: AiAspect): string {
  if (aspect === 'portrait') return 'portrait_4_3'
  if (aspect === 'landscape') return 'landscape_4_3'
  return 'square_hd'
}

// anti-SSRF: URL картинки приходит из ответа провайдера. Провайдер доверенный, но
// при компрометации/смене ответа не даём фетчить внутренние/loopback-адреса (метаданные
// облака, localhost). Требуем https и отсекаем literal-IP приватных диапазонов.
function assertSafeImageUrl(raw: string): void {
  let u: URL
  try { u = new URL(raw) }
  catch { throw new Error('Некорректный URL изображения') }
  if (u.protocol !== 'https:') throw new Error('Небезопасный протокол изображения')
  const h = u.hostname.toLowerCase()
  if (
    h === 'localhost' || h === '0.0.0.0' || h === '::1'
    || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
    || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  ) throw new Error('Запрещённый адрес изображения')
}

interface FalImage { url: string; width?: number; height?: number; content_type?: string }
interface FalResponse { images?: FalImage[] }

async function falGenerate(prompt: string, aspect: AiAspect): Promise<AiImageResult> {
  const cfg = useRuntimeConfig()
  const apiKey = cfg.aiImageApiKey as string
  const model = (cfg.aiImageModel as string) || 'fal-ai/ideogram/v3'
  const tier = (cfg.aiImageTier as string) || 'BALANCED'

  const run = async (): Promise<AiImageResult> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 90_000)
    try {
      // синхронный эндпоинт fal: ждёт результат и отдаёт ссылки на изображения
      const res = await $fetch<FalResponse>(`https://fal.run/${model}`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: {
          prompt,
          rendering_speed: tier,
          image_size: imageSizeFor(aspect),
          expand_prompt: false,
          num_images: 1,
          negative_prompt: NEGATIVE,
        },
      })
      const img = res.images?.[0]
      if (!img?.url) throw new Error('Провайдер не вернул изображение')
      assertSafeImageUrl(img.url)
      const bytes = await $fetch<ArrayBuffer>(img.url, { responseType: 'arrayBuffer' })
      return {
        buffer: Buffer.from(bytes),
        contentType: img.content_type || 'image/png',
        w: img.width || 1024,
        h: img.height || 1024,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    return await run()
  } catch {
    // одна повторная попытка (cold start / временная сетевая ошибка провайдера)
    return await run()
  }
}

export const falIdeogramProvider: AiImageProvider = {
  name: 'fal-ideogram',
  generate: falGenerate,
}

export function getAiImageProvider(): AiImageProvider {
  // выбор по env позже (Recraft/Flux); сейчас всегда fal/Ideogram
  return falIdeogramProvider
}
