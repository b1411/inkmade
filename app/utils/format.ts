// Форматирование ЧИСЕЛ/ЦЕН для интерфейса. Локаль-безопасно для рынка KZ: ru-RU и kk-KZ
// дают идентичную группировку разрядов (пробел) и один символ ₸ → строковый вывод не зависит
// от активной локали. Для ДАТ используйте useFormat() (там формат зависит от локали).

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

// Даты вынесены в useFormat() (composables/useFormat.ts): их формат зависит от активной
// локали (названия месяцев на KK отличаются от RU), а плоская util-функция локаль не видит.
