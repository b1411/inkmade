// Резолвер тенант-хоста B2B-магазина (<slug>.inkmade.kz → slug). Чистая функция без
// зависимостей от Nuxt/окружения — host-независима, поэтому одинакова на любом хостинге
// (Vercel сейчас / свой сервер в РК после переезда) и покрывается юнит-тестами.
//
// Пока FEATURES.subdomains выключен, это НЕ вызывается в бою (тенант-хостов нет). Слой
// подготовлен заранее: после переезда включение субдоменов = флаг + один драйвер провижининга
// (см. server/utils/subdomain.ts), без переписывания витрины/ссылок.

// Метки, которые НЕ являются магазином-тенантом (зеркало public.is_reserved_shop_slug, 0086):
// системные пути платформы + инфраструктура/DNS/почта. Хост с такой меткой резолвится в null —
// это платформа/инфра, а не витрина (напр. admin.inkmade.kz не должен считаться магазином).
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  // системные пути платформы
  'www', 'api', 'admin', 'studio', 'studio-designer', 'designer', 'app', 'mail',
  'shop', 'shops', 'shop-admin', 'shop-new', 'shop-claim', 'cdn', 'static', 'assets',
  'account', 'business', 'catalog', 'cart', 'checkout', 'login', 'logout', 'register',
  'reset', 'forgot', 'order', 'orders', 'customize', 'invite', 'legal', 'profile',
  's', 'auth', 'blog', 'help', 'support', 'about', 'inkmade', 'contacts', 'faq',
  // инфраструктура/DNS/почта
  'ns', 'ns1', 'ns2', 'ns3', 'mx', 'mx1', 'mx2', 'smtp', 'imap', 'pop', 'pop3',
  'email', 'webmail', 'ftp', 'sftp', 'vpn', 'proxy', 'gateway', 'router',
  'dev', 'stage', 'staging', 'test', 'testing', 'preview', 'demo', 'sandbox',
  'status', 'docs', 'dashboard', 'panel', 'internal', 'private', 'secure',
  'm', 'mobile', 'web', 'server', 'host', 'localhost', 'root', 'system',
])

// Метка зарезервирована (нельзя отдавать под витрину): из списка выше, либо служебная
// (ACME/DNS `_…`), либо punycode (`xn--…`, гомоглиф под чужой бренд), либо чисто числовая.
export function isReservedSubdomain(label: string): boolean {
  const l = label.toLowerCase()
  return RESERVED_SUBDOMAINS.has(l) || l.startsWith('_') || l.startsWith('xn--') || /^[0-9]+$/.test(l)
}

// Базовый домен для субдоменов из siteUrl: https://inkmade.kz → inkmade.kz, www отбрасываем.
export function baseDomainFromSite(siteUrl?: string | null): string {
  if (!siteUrl) return ''
  try {
    return new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Извлечь slug магазина-тенанта из host. Возвращает slug ТОЛЬКО для валидного
// одноуровневого <slug>.<baseDomain>; для apex, www, портов/хвостовой точки, IP,
// многоуровневых, reserved-меток, кривого формата и чужих доменов — null.
export function tenantFromHost(host: string | null | undefined, baseDomain: string): string | null {
  if (!host || !baseDomain) return null
  const h = host.toLowerCase().split(':')[0]!.replace(/\.$/, '').trim() // без порта и хвостовой точки
  const base = baseDomain.toLowerCase().replace(/\.$/, '').trim()
  if (!h || !base) return null
  if (h === base || h === `www.${base}`) return null

  const suffix = `.${base}`
  if (!h.endsWith(suffix)) return null
  const label = h.slice(0, -suffix.length)
  if (!label || label.includes('.')) return null // только один уровень поддомена

  // формат slug совпадает с create_my_shop / constraint shops_slug_format (0086)
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null
  if (isReservedSubdomain(label)) return null
  return label
}
