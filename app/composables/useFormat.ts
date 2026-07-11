// Локализованное форматирование дат и денег. Один источник правды вместо
// разбросанных хардкодов toLocaleString('ru') / Intl.NumberFormat('ru-RU') / '₸'.
// Локаль берётся из активной i18n-локали (ru → ru-RU, kk → kk-KZ).
export const useFormat = () => {
  const { locale } = useI18n()
  const intlLocale = computed(() => (locale.value === 'kk' ? 'kk-KZ' : 'ru-RU'))

  const date = (d: string | number | Date) => new Date(d).toLocaleDateString(intlLocale.value)
  const dateTime = (d: string | number | Date) => new Date(d).toLocaleString(intlLocale.value)
  // короткий формат с названием месяца по локали («13 июн 2026» / «13 мау 2026»),
  // с защитой от пустого/битого значения → «—» (drop-in для utils/format.formatDate).
  const dateShort = (d: string | number | Date | null | undefined) => {
    if (!d) return '—'
    const dd = new Date(d)
    return Number.isNaN(dd.getTime())
      ? '—'
      : dd.toLocaleDateString(intlLocale.value, { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const number = (n: number | string | null | undefined) =>
    new Intl.NumberFormat(intlLocale.value).format(Math.round(Number(n) || 0))
  const money = (amount: number | string | null | undefined, currency = '₸') => `${number(amount)} ${currency}`

  return { date, dateTime, dateShort, number, money }
}
