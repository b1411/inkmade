import { FEATURES } from '~~/shared/config/features'
import { baseDomainFromSite } from '~~/shared/utils/tenant'

// Единый построитель абсолютного URL витрины магазина.
//   • subdomains ВЫКЛ (сейчас): путь /s/<slug> на общем хосте;
//   • subdomains ВКЛ (после переезда): <slug>.<baseDomain>.
// Заодно единый фолбэк хоста убирает прежний разнобой (в части мест дефолт был
// inkmade-pi.vercel.app, в других — inkmade.kz).
const FALLBACK_SITE = 'https://inkmade.kz'

export function siteBase(siteUrl?: string | null): string {
  return String(siteUrl || FALLBACK_SITE).replace(/\/+$/, '')
}

export function shopStorefrontUrl(slug: string, siteUrl?: string | null): string {
  const site = siteBase(siteUrl)
  if (FEATURES.subdomains) {
    const base = baseDomainFromSite(site)
    if (base) return `https://${slug}.${base}`
  }
  return `${site}/s/${slug}`
}
