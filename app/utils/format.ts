// Единое форматирование значений для всего интерфейса (русская локаль, рынок KZ).
// Раньше цены форматировались по-разному в 20+ местах (toLocaleString/toFixed/без формата) —
// это давало визуальную несогласованность. Используем эти хелперы вместо ad-hoc форматирования.

// Цена в тенге с разделителями разрядов и символом валюты. Дробную часть отбрасываем —
// цены в проекте целые. Невалидное значение → «0 ₸», чтобы интерфейс не показывал NaN.
export function formatPrice(value: number | null | undefined): string {
  const n = Number(value)
  const safe = Number.isFinite(n) ? Math.round(n) : 0
  return `${safe.toLocaleString('ru-RU')} ₸`
}

// Только число с разделителями, без символа валюты (для случаев со своим суффиксом).
export function formatNumber(value: number | null | undefined): string {
  const n = Number(value)
  return (Number.isFinite(n) ? n : 0).toLocaleString('ru-RU')
}

// Дата в коротком русском формате (например «13 июн 2026»). Пустое/битое значение → «—».
export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Дата и время (для админ-таблиц, логов).
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
