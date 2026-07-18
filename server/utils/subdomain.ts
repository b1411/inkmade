// Провижининг субдомена магазина (<slug>.inkmade.kz) — ШОВ (платформо-независимый контракт).
// Реализация зависит от хостинга и намеренно ПОКА не написана:
//   • на своём сервере в РК (план после переезда с Vercel) — Caddy on-demand TLS + wildcard
//     DNS `*.inkmade.kz` → сервер: ни одного вызова на магазин, серт берётся при первом заходе;
//   • на Vercel — вызов Vercel Domains API на каждый магазин (нужен Pro).
// Пока витрина живёт на пути /s/<slug>, поэтому здесь — no-op заглушки со стабильным контрактом.
// Точки вызова (создание магазина / кнопка «получить фирменный субдомен» / удаление) подключаются
// к этим функциям, а конкретный драйвер вставится одним модулем без переписывания вызовов.

export interface SubdomainResult {
  ok: boolean
  status: 'not_implemented' | 'active' | 'pending' | 'error'
  detail?: string
}

// TODO(subdomains): реализовать после выбора целевого хостинга. Сейчас — no-op.
export function provisionSubdomain(_slug: string): Promise<SubdomainResult> {
  return Promise.resolve({ ok: false, status: 'not_implemented' })
}

export function unprovisionSubdomain(_slug: string): Promise<SubdomainResult> {
  return Promise.resolve({ ok: false, status: 'not_implemented' })
}
