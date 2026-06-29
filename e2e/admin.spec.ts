import { test, expect } from '@playwright/test'
import { ADMIN, login } from './helpers/auth'

// E2E роли «Администратор». Гейт на креды E2E_ADMIN_EMAIL/PASSWORD — без них skip.
// PROD-SAFE: страницы читают реальные данные, но ЛЮБАЯ мутация (инвайт, bulk-публикация)
// перехватывается route.fulfill и до прод-БД не доходит. Реальных изменений тесты не делают.
test.describe('Админка — роль администратора', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'нет E2E_ADMIN_EMAIL/PASSWORD')
    await login(page, ADMIN.email!, ADMIN.password!)
  })

  test('после входа админ попадает в кабинет /admin', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible()
  })

  test('сайдбар содержит расширенные разделы (advancedAdmin включён)', async ({ page }) => {
    await page.goto('/admin')
    const nav = page.locator('aside')
    await expect(nav.getByRole('link', { name: /Товары/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Заказы/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Финансы/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Пользователи/ })).toBeVisible()
  })

  test('список товаров рендерится', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.getByRole('heading', { level: 1, name: 'Товары' })).toBeVisible()
    // либо таблица товаров, либо пустое состояние — но страница жива
    await expect(page.getByRole('link', { name: /Новый товар/ }).first()).toBeVisible()
  })

  test('мастер создания товара открывается', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Создание товара' })).toBeVisible()
  })

  test('страница пользователей: форма приглашения + мок инвайта', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Пригласить пользователя')).toBeVisible()

    // перехватываем серверный инвайт — реального письма/пользователя НЕ создаём
    await page.route('**/api/admin/users/invite', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, email: 'e2e@inkmade.kz', role: 'customer' }) }))

    await page.locator('input[type="email"]').first().fill('e2e@inkmade.kz')
    const [req] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/api/admin/users/invite') && r.method() === 'POST'),
      page.getByRole('button', { name: /Отправить приглашение/ }).click(),
    ])
    expect(req).toBeTruthy()
    await expect(page.getByText(/Приглашение отправлено/)).toBeVisible()
  })

  test('страница ручного заказа рендерится, создание заблокировано без данных', async ({ page }) => {
    await page.goto('/admin/orders/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Ручной заказ' })).toBeVisible()
    // кнопка создания недоступна, пока не выбран клиент и нет позиций
    await expect(page.getByRole('button', { name: 'Создать заказ' })).toBeDisabled()
  })

  test('финансы рендерятся', async ({ page }) => {
    await page.goto('/admin/finance')
    await expect(page.getByRole('heading', { level: 1, name: 'Финансы' })).toBeVisible()
  })

  test('массовые операции: выбор товаров показывает панель действий + мок публикации', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.getByRole('heading', { level: 1, name: 'Товары' })).toBeVisible()

    const rows = page.locator('tbody tr')
    const n = await rows.count()
    test.skip(!n, 'в каталоге нет товаров для массовой операции')

    // чекбокс «выбрать все» в шапке таблицы
    await page.getByRole('checkbox').first().click()
    await expect(page.getByText(/Выбрано:/)).toBeVisible()

    // мокаем массовый UPDATE products (PATCH в Supabase REST) — реальной записи нет
    await page.route('**/rest/v1/products**', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 204, body: '' })
      } else {
        await route.continue()
      }
    })

    const [patch] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/rest/v1/products') && r.method() === 'PATCH'),
      page.getByRole('button', { name: 'Опубликовать' }).click(),
    ])
    expect(patch).toBeTruthy()
  })
})
