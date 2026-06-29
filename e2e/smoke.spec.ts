import { test, expect } from '@playwright/test'

// Smoke публичных страниц: грузятся (HTTP ok), имеют заголовок и не валятся
// с необработанной JS-ошибкой. Контент ниже первого экрана может быть под
// UiReveal (в headless остаётся opacity:0 — это артефакт, не баг), поэтому
// проверяем НАЛИЧИЕ в DOM (toBeAttached), а не видимость.
const PUBLIC_ROUTES = [
  '/',
  '/catalog',
  '/login',
  '/register',
  '/legal/terms',
  '/legal/privacy',
]

for (const path of PUBLIC_ROUTES) {
  test(`публичная страница ${path} загружается без ошибок`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.ok(), `HTTP-статус ${path}`).toBeTruthy()

    // на странице есть хотя бы один заголовок
    await expect(page.locator('h1, h2').first()).toBeAttached()

    // нет необработанных исключений на странице
    expect(errors, `JS-ошибки на ${path}`).toHaveLength(0)
  })
}

test('404 для несуществующего маршрута', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(404)
})
