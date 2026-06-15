// Клиентская проверка загружаемых файлов по СИГНАТУРЕ (magic-bytes), а не по
// расширению/MIME, которые подделываются. Первый рубеж UX (быстрый отказ);
// серверная гарантия — суженный allowed_mime_types бакета design-uploads
// (SVG исключён — главный вектор XSS в публичном бакете).

export type DetectedKind = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif' | 'pdf' | null

export const DEFAULT_MAX_MB = 25

const MIME: Record<Exclude<DetectedKind, null>, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  pdf: 'application/pdf',
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  let s = ''
  for (let i = start; i < start + len && i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return s
}

function starts(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false
  return sig.every((b, i) => bytes[i] === b)
}

/** Определить реальный тип файла по первым байтам. null — неизвестный/неразрешённый. */
export function detectKind(bytes: Uint8Array): DetectedKind {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (starts(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  if (starts(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf' // %PDF
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  // ISO-BMFF: ....ftyp<brand>, бренды avif/avis/mif1/heic — берём только avif-семейство
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return null
}

export interface GuardOptions {
  maxMb?: number
  /** разрешённые типы; по умолчанию растр + PDF (без SVG). */
  allow?: Array<Exclude<DetectedKind, null>>
}

export interface GuardResult {
  kind: Exclude<DetectedKind, null>
  /** MIME по сигнатуре — передавать в Storage.upload как contentType (не доверять file.type). */
  contentType: string
}

/**
 * Провалидировать файл: размер + сигнатура из белого списка. Бросает Error
 * с человекочитаемым сообщением (для тоста). По умолчанию SVG запрещён.
 */
export async function assertSafeUpload(file: File, opts: GuardOptions = {}): Promise<GuardResult> {
  const maxMb = opts.maxMb ?? DEFAULT_MAX_MB
  const allow = opts.allow ?? ['png', 'jpeg', 'webp', 'gif', 'avif', 'pdf']

  if (file.size === 0) throw new Error('Файл пустой')
  if (file.size > maxMb * 1024 * 1024) throw new Error(`Файл слишком большой. Лимит ${maxMb} МБ.`)

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const kind = detectKind(head)
  if (!kind || !allow.includes(kind)) {
    throw new Error('Недопустимый формат файла. Разрешены PNG, JPG, WEBP, GIF, AVIF или PDF.')
  }
  return { kind, contentType: MIME[kind] }
}
