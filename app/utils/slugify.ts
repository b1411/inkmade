// Транслитерация кириллицы (RU + KK) в латинский slug — общий util для админ-категорий
// и адреса B2B-витрины (/shop-new). Казахские буквы обязательны: магазин команды может
// называться по-казахски, а slug обязан оставаться DNS-совместимой меткой (фаза B6 —
// субдомены <slug>.inkmade.kz, формат сверяется constraint shops_slug_format).
const TRANSLIT: Record<string, string> = {
  // русский
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // казахский (специфичные буквы; общие с русским берутся выше)
  ә: 'a', ғ: 'g', қ: 'q', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
}

export function slugify(s: string): string {
  return (s || '').toLowerCase().split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Slug витрины дополнительно ограничен DNS-меткой: максимум 63 символа, без хвостового
// дефиса после обрезки (иначе shops_slug_format отклонит вставку).
export function shopSlugify(s: string): string {
  return slugify(s).slice(0, 63).replace(/-+$/g, '')
}
