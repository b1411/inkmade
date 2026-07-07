// robots.txt (P2 SEO). Динамический — чтобы строка Sitemap ссылалась на актуальный
// siteUrl (домен меняется при запуске). Приватные зоны (кабинеты, оплата, api,
// recovery-страницы) закрыты от индексации.
export default defineEventHandler((event) => {
  const base = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')

  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /shop-admin',
    'Disallow: /studio',
    'Disallow: /studio-designer',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /order/',
    'Disallow: /reset',
    'Disallow: /forgot',
    'Disallow: /api/',
  ]
  if (base) lines.push('', `Sitemap: ${base}/sitemap.xml`)

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return lines.join('\n') + '\n'
})
