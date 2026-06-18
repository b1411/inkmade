import { test, expect } from '@playwright/test'

// E2E воронки покупки. PROD-SAFE: preview подключён к прод-Supabase, поэтому
// НЕ создаём реальных заказов — корзину сидируем в localStorage, а запись заказа
// и платёж перехватываем на сетевой границе (route.fulfill). Серверная логика
// цены/заказа покрыта юнит-тестами (pricing/schemas/order-status).

const CART_ITEM = {
  id: 'ci_e2e', productId: '00000000-0000-0000-0000-000000000001',
  slug: 'oversize-tee', alias: 'oversize-tee', title: 'Футболка оверсайз (E2E)',
  variantId: '00000000-0000-0000-0000-000000000002', colorName: 'Чёрный',
  colorHex: '#111111', size: 'M', printMethod: 'dtf', spec: {}, unitPrice: 6900, quantity: 1,
}

// сидируем корзину до загрузки скриптов страницы
test.beforeEach(async ({ page }) => {
  await page.addInitScript((item) => {
    localStorage.setItem('inkmade_cart', JSON.stringify([item]))
  }, CART_ITEM)
})

test.describe('Воронка покупки', () => {
  test('корзина показывает позицию и кнопку оформления', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.getByText(CART_ITEM.title)).toBeVisible()
    await expect(page.locator('a[href="/checkout"]')).toBeVisible()
  })

  test('оформление требует входа (auth-гейт)', async ({ page }) => {
    await page.goto('/cart')
    await page.locator('a[href="/checkout"]').click()
    // checkout за middleware:auth → редирект на вход
    await expect(page).toHaveURL(/login|auth/i)
  })

  // Полная воронка с входом — только при заданных кредах (E2E_CUSTOMER_EMAIL/PASSWORD).
  // Запись заказа и платёж замоканы → прод-данные не затрагиваются.
  const email = process.env.E2E_CUSTOMER_EMAIL
  const password = process.env.E2E_CUSTOMER_PASSWORD
  test('авторизованный checkout доходит до оплаты (моки записи)', async ({ page }) => {
    test.skip(!email || !password, 'нет E2E_CUSTOMER_EMAIL/PASSWORD')

    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(email!)
    await page.locator('input[type="password"]').first().fill(password!)
    await page.getByRole('button', { name: /войти|вход/i }).first().click()
    await page.waitForURL(url => !/login/i.test(url.toString()), { timeout: 15_000 })

    // перехват записи заказа и платежа — без реальных мутаций
    await page.route('**/api/orders/create', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orderId: 'e2e-order', total: CART_ITEM.unitPrice }) }))
    await page.route('**/api/payment/create', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payUrl: '/checkout/pay/e2e-order' }) }))

    await page.goto('/checkout')
    await page.getByRole('textbox', { name: /имя|fullname/i }).first().fill('E2E Тест')
    await page.locator('input[type="email"]').first().fill('e2e@inkmade.kz')
    await page.locator('input[type="tel"]').first().fill('+7 701 000 00 00')
    // город/адрес — по порядку текстовых полей секции
    const city = page.locator('input').filter({ hasNot: page.locator('[type="email"],[type="tel"]') })
    await city.nth(0).fill('Алматы').catch(() => {})
    await page.getByRole('button', { name: /оплат|перейти к оплате|pay/i }).first().click()
    await expect(page).toHaveURL(/checkout\/pay/i)
  })
})
