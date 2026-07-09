import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// sitemap.xml (P2 SEO). Динамический: статические публичные страницы + активные
// категории (/catalog/<slug>) + активные товары (/product/<slug>) из БД. Приватные
// зоны и витрины магазинов не индексируем. base из siteUrl (домен меняется при запуске).
export default defineEventHandler(async (event) => {
  const base = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
  const svc = serverSupabaseServiceRole<Database>(event)

  const [{ data: cats }, { data: prods }] = await Promise.all([
    svc.from('categories').select('slug').eq('is_active', true),
    svc.from('products').select('slug, created_at').eq('is_active', true),
  ])

  interface Url { loc: string; lastmod?: string; priority: string }
  const urls: Url[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/catalog', priority: '0.7' },
    { loc: '/business', priority: '0.6' },
    { loc: '/legal', priority: '0.3' },
    { loc: '/legal/offer', priority: '0.3' },
    { loc: '/legal/terms', priority: '0.3' },
    { loc: '/legal/privacy', priority: '0.3' },
    { loc: '/legal/delivery', priority: '0.3' },
    { loc: '/legal/cookies', priority: '0.3' },
  ]
  for (const c of cats ?? []) {
    if (c.slug) urls.push({ loc: `/catalog/${c.slug}`, priority: '0.6' })
  }
  for (const p of prods ?? []) {
    if (!p.slug) continue
    urls.push({
      loc: `/product/${p.slug}`,
      lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
      priority: '0.8',
    })
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = urls
    .map((u) => {
      const parts = [`<loc>${esc(base + u.loc)}</loc>`]
      if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`)
      parts.push(`<priority>${u.priority}</priority>`)
      return `  <url>${parts.join('')}</url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return xml
})
