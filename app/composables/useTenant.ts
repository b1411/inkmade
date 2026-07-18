import { FEATURES } from '~~/shared/config/features'
import { tenantFromHost, baseDomainFromSite } from '~~/shared/utils/tenant'

// Slug магазина, если запрос пришёл на его субдомен (<slug>.inkmade.kz). Пока
// FEATURES.subdomains выключен — ВСЕГДА null (тенант-хостов нет), поэтому витрина
// продолжает читать slug из route.params ровно как сейчас. Активируется одним флагом
// после переезда: витрина начнёт брать slug отсюда, ссылки — из shopUrl.ts.
export function useTenant() {
  const url = useRequestURL()
  const { public: { siteUrl } } = useRuntimeConfig()
  const tenantSlug = computed<string | null>(() =>
    FEATURES.subdomains ? tenantFromHost(url.host, baseDomainFromSite(String(siteUrl || ''))) : null,
  )
  return { tenantSlug }
}
