import { expect, test } from '@playwright/test'

const routes = [
  { path: '/', heading: /Твой принт|Свой принт/i },
  { path: '/catalog', heading: /Основы для твоего дизайна/i },
  { path: '/product/tshirt', heading: /^Футболка$/i },
  { path: '/business', heading: /Мерч-магазин/i }
]

for (const route of routes) {
  test(`${route.path} renders the primary experience`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth)
    )
  })
}

test('customizer exposes Simple and Advanced modes with a live price', async ({ page }) => {
  const response = await page.goto('/customize/tshirt', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBeLessThan(400)
  await expect(page.getByRole('button', { name: 'simple', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'advanced', exact: true })).toBeVisible()
  await expect(page.getByText('4 990 ₸').first()).toBeVisible({ timeout: 15_000 })
})

test('mobile commerce routes do not overflow horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/catalog', '/product/tshirt', '/customize/tshirt', '/business']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }))
    expect(dimensions.scrollWidth, path).toBeLessThanOrEqual(dimensions.clientWidth)
  }
})
