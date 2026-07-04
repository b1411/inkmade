// Безопасный URL для CSS background-image. banner_url магазина задаёт владелец и он
// попадает в строку стиля `background-image:url('...')` — без санитайзинга это позволяет
// сломать вёрстку/подгрузить внешний ресурс (CSS-инъекция, аудит F6). Пропускаем только
// http(s)-ссылки без символов, ломающих строку стиля (кавычки/скобки/пробелы/;). Иначе ''.
export function safeCssUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return ''
  if (/["'()\\\s;]/.test(u)) return ''
  return u
}
