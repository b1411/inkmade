import { FEATURES } from '~~/shared/config/features'
import { tenantFromHost, baseDomainFromSite } from '~~/shared/utils/tenant'

// Изоляция брендового хоста магазина (<slug>.inkmade.kz). Когда subdomains включён и
// запрос пришёл на тенант-хост, наружу отдаём ТОЛЬКО витрину — платформенные разделы
// (админка, кабинеты, checkout, каталог, конструктор) на брендовом origin недоступны.
// Иначе тенант-хост светил бы всю платформу со своего домена — это безопасность, а не
// косметика (host-измерение к path-гейту feature-flags.global).
//
// Пока FEATURES.subdomains выключен — тенант-хостов нет, middleware сразу выходит
// (полный no-op на текущем хостинге, поведение платформы не меняется).
export default defineNuxtRouteMiddleware((to) => {
  if (!FEATURES.subdomains) return
  const url = useRequestURL()
  const { public: { siteUrl } } = useRuntimeConfig()
  const slug = tenantFromHost(url.host, baseDomainFromSite(String(siteUrl || '')))
  if (!slug) return // apex/www — обычная платформа

  // на тенант-хосте разрешены только корень (→ витрина магазина) и путь витрины /s/*
  const p = to.path
  const allowed = p === '/' || p === '/s' || p.startsWith('/s/')
  if (!allowed) {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page Not Found' }))
  }
})
