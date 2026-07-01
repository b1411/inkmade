import { test, expect, type Page } from '@playwright/test'
import { ADMIN, CUSTOMER } from './helpers/auth'

// Visual review of zones built this session (Operator/Customer roles + Admin polish).
// Public catalog is always captured (ProductCard object-contain fix). Cabinets need
// login — skipped when E2E_* creds are absent.
const DIR = 'test-results/zones'
const shot = (name: string) => `${DIR}/${name}.png`

// Hydration-safe login for the dev server: wait for networkidle + a beat, else the
// form submits natively before Vue attaches @submit.prevent. Uses type=submit
// selector to avoid locale-dependent button text.
async function loginDev(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(u => !/login/i.test(u.toString()), { timeout: 20_000 })
}

test.describe('zones review', () => {
  test('public: catalog card fit (object-contain)', async ({ page }) => {
    await page.goto('/catalog/textile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    await page.screenshot({ path: shot('01-category-desktop'), fullPage: true })
    const card = page.locator('a[href^="/product/"]').first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await card.screenshot({ path: shot('02-product-card') })
  })

  test('operator /studio (admin can access)', async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'no E2E_ADMIN creds')
    await loginDev(page, ADMIN.email!, ADMIN.password!)
    await page.goto('/studio')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: shot('10-studio-queue'), fullPage: true })
    await page.goto('/studio/stock')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: shot('11-studio-stock'), fullPage: true })
    // прямая навигация на детальную (обход гонки NuxtLink-навигации в dev)
    const orderId = process.env.E2E_ORDER_ID
    if (orderId) {
      await page.goto(`/studio/order/${orderId}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)
      await page.screenshot({ path: shot('12-studio-order'), fullPage: true })
    }
  })

  test('admin /finance + /audit', async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'no E2E_ADMIN creds')
    await loginDev(page, ADMIN.email!, ADMIN.password!)
    await page.goto('/admin/finance')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: shot('20-admin-finance'), fullPage: true })
    await page.goto('/admin/audit')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: shot('21-admin-audit'), fullPage: true })
  })

  test('customer /account zones', async ({ page }) => {
    test.skip(!CUSTOMER.email || !CUSTOMER.password, 'no E2E_CUSTOMER creds')
    await loginDev(page, CUSTOMER.email!, CUSTOMER.password!)
    for (const [path, name] of [
      ['/account', '30-account-profile'],
      ['/account/orders', '31-account-orders'],
      ['/account/designs', '32-account-designs'],
    ] as const) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: shot(name), fullPage: true })
    }
    await page.goto('/account/orders')
    await page.waitForLoadState('networkidle')
    const first = page.locator('a[href^="/order/"]').first()
    if (await first.count()) {
      await first.click()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: shot('33-customer-order'), fullPage: true })
    }
  })
})
