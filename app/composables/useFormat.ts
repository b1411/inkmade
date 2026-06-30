// Локализованное форматирование дат и денег. Один источник правды вместо
// разбросанных хардкодов toLocaleString('ru') / Intl.NumberFormat('ru-RU') / '₸'.
// Локаль берётся из активной i18n-локали (ru → ru-RU, kk → kk-KZ).
export const useFormat = () => {
  const { locale } = useI18n()
  const intlLocale = computed(() => (locale.value === 'kk' ? 'kk-KZ' : 'ru-RU'))

  const date = (d: string | number | Date) => new Date(d).toLocaleDateString(intlLocale.value)
  const dateTime = (d: string | number | Date) => new Date(d).toLocaleString(intlLocale.value)
  const money = (amount: number | string, currency = '₸') =>
    `${new Intl.NumberFormat(intlLocale.value).format(Math.round(Number(amount) || 0))} ${currency}`

  return { date, dateTime, money }
}
