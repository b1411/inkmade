import { googleFontHref } from '~~/shared/config/print-fonts'

// Загрузка Google-шрифта по требованию (§7.1). Шрифты принта (~200) не предзагружаются —
// при выборе инжектим <link> один раз на семейство и ждём document.fonts, чтобы Konva
// рисовал текст уже загруженным шрифтом, а не fallback'ом.
const linked = new Set<string>()

export function useFontLoader() {
  async function load(family: string): Promise<void> {
    if (import.meta.server || !family) return
    if (!linked.has(family)) {
      const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`
      if (!document.getElementById(id)) {
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = googleFontHref(family)
        document.head.appendChild(link)
      }
      linked.add(family)
    }
    try {
      // sample с кириллицей: Google отдаёт кириллицу отдельным unicode-range —
      // без образца грузится только латиница, и печатный экспорт кириллицы падал
      // на fallback-глиф (основной язык магазина — RU/KK). Триггерим оба подмножества.
      const sample = 'AaЯяӘ0'
      await document.fonts.load(`48px "${family}"`, sample)
      await document.fonts.load(`bold 48px "${family}"`, sample)
    } catch { /* swap-фолбэк допустим, если CDN недоступен */ }
  }
  return { load }
}
