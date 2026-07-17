import { test, expect } from '@playwright/test'

const ROUTES = ['/', '/catalog', '/business', '/login', '/register', '/legal/privacy']

for (const route of ROUTES) {
  test(`${route} has no mobile horizontal overflow`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator('h1, h2').first()).toBeAttached()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test('mobile navigation exposes the primary commerce routes', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('button', { name: /меню|menu/i }).first()
  if (await menu.count()) await menu.click()
  await expect(page.getByRole('link', { name: /каталог/i }).first()).toBeVisible()
})

test('interactive controls have usable touch targets', async ({ page }) => {
  await page.goto('/login')
  const controls = page.locator('button:visible, a:visible, input:visible')
  const count = Math.min(await controls.count(), 30)
  for (let index = 0; index < count; index++) {
    const box = await controls.nth(index).boundingBox()
    if (!box) continue
    expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(24)
  }
})
