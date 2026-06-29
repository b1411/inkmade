import type { Page } from '@playwright/test'

// Креды тест-аккаунтов берём из окружения — без них авторизованные сценарии
// помечаются skip (как в purchase-funnel). PROD-SAFE: preview смотрит в прод-Supabase,
// поэтому реальные мутации в тестах ВСЕГДА мокаются через route.fulfill.
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
}
export const CUSTOMER = {
  email: process.env.E2E_CUSTOMER_EMAIL,
  password: process.env.E2E_CUSTOMER_PASSWORD,
}

// Логин через брендовый экран /login. После входа signIn редиректит в кабинет
// по роли (admin → /admin). Ждём ухода со страницы логина.
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: /войти|вход/i }).first().click()
  await page.waitForURL(u => !/login/i.test(u.toString()), { timeout: 20_000 })
}
