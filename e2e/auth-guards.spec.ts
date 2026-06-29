import { test, expect } from '@playwright/test'

// Гарды доступа (§8.1): защищённые кабинеты недоступны гостю — middleware
// (auth/admin-role/studio-role) уводит на /login. Креды не нужны — проверяем
// именно неавторизованный редирект.
const GUARDED_ROUTES = [
  '/account',
  '/account/orders',
  '/account/addresses',
  '/admin',
  '/admin/products',
  '/admin/orders',
  '/admin/users',
  '/checkout',
  '/studio',
]

for (const path of GUARDED_ROUTES) {
  test(`гость не попадает на ${path} (редирект на вход)`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/login/i)
  })
}

// Скрытые фичей роуты дизайнерского маркетплейса должны отдавать 404
// (designerMarketplace выключен), а не пускать внутрь.
const FEATURE_OFF_ROUTES = ['/studio-designer', '/admin/designers']
for (const path of FEATURE_OFF_ROUTES) {
  test(`выключенная фичей страница ${path} отдаёт 404`, async ({ page }) => {
    const res = await page.goto(path)
    // либо честный 404, либо редирект на вход (если гард сработал раньше) — но не 200-контент кабинета
    expect([404]).toContain(res?.status() ?? 404)
  })
}
