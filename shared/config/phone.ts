// Казахстанские номера телефонов: нормализация, валидация, форматирование, WhatsApp.
// Используется при регистрации (сбор лида), в админке лидов и серверной валидации.
//
// KZ-формат: код страны 7, мобильные значащие номера — 10 цифр, начинающиеся с 7
// (700/701/702/705/707/708/747/771/775/776/777/778…). Полный E.164: +77XXXXXXXXX.

/** Привести произвольный ввод к E.164 (+77XXXXXXXXX) или вернуть null, если не похоже на KZ-моб. */
export function normalizeKzPhone(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = input.replace(/\D/g, '')
  // 8 (7XX) … → 7 (7XX) …
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1)
  // 7XXXXXXXXX (10 цифр, без кода страны) → добавить 7
  if (digits.length === 10 && digits.startsWith('7')) digits = '7' + digits
  // теперь ждём 11 цифр, начинающихся с 77 (код страны 7 + мобильный 7XX)
  if (digits.length === 11 && digits.startsWith('77')) return '+' + digits
  return null
}

/** Валиден ли ввод как KZ-мобильный. */
export function isValidKzPhone(input: string | null | undefined): boolean {
  return normalizeKzPhone(input) !== null
}

/** E.164 (+77001234567) → читаемый формат «+7 (700) 123-45-67». На невалидном — вернёт как есть. */
export function formatKzPhone(e164: string | null | undefined): string {
  const n = normalizeKzPhone(e164)
  if (!n) return e164 ?? ''
  const d = n.slice(1) // 77001234567
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
}

/** Ссылка на чат WhatsApp по номеру (wa.me требует цифры без «+»). null — если номер невалиден. */
export function whatsAppLink(e164: string | null | undefined, text?: string): string | null {
  const n = normalizeKzPhone(e164)
  if (!n) return null
  const base = `https://wa.me/${n.slice(1)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Ссылка для звонка. */
export function telLink(e164: string | null | undefined): string | null {
  const n = normalizeKzPhone(e164)
  return n ? `tel:${n}` : null
}
