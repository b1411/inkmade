import { test, expect } from '@playwright/test'
import { ADMIN, login } from './helpers/auth'

// E2E фичи «B2B-магазин мерча» в path-режиме /s/<slug> (субдомены — фаза B6, не в коде).
// PROD-SAFE: preview смотрит в прод-Supabase, поэтому ЛЮБАЯ мутация (заявка, создание
// магазина, аналитика) перехватывается route.fulfill и до прод-БД не доходит.
// Ограничение: витрина и админ-очередь читают данные на SSR (useAsyncData) — эти запросы
// идут из Nitro и page.route их НЕ перехватывает. Поэтому:
//   • публичное (лендинг, форма, гарды, 404) — детерминировано, без данных;
//   • богатая витрина с товарами — на РЕАЛЬНОМ магазине за env-гейтом E2E_SHOP_SLUG.

const SHOP_SLUG = process.env.E2E_SHOP_SLUG

// ─────────────────────────────────────────────────────────────────────────────
// 1. Посадочная /business + форма заявки
// ─────────────────────────────────────────────────────────────────────────────
test.describe('B2B — лендинг и заявка на магазин', () => {
  test('/business открывается (фича b2bShops включена): hero + форма', async ({ page }) => {
    const res = await page.goto('/business')
    expect(res?.ok(), 'HTTP-статус /business').toBeTruthy()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // поля формы заявки (по плейсхолдерам — устойчиво к вёрстке UFormField)
    await expect(page.getByPlaceholder('Ваша команда или бренд')).toBeVisible()
    await expect(page.getByPlaceholder('team@company.kz')).toBeVisible()
    await expect(page.getByRole('button', { name: /Отправить заявку/ })).toBeVisible()
  })

  test('клиентская валидация: пустая форма не отправляется (POST не уходит)', async ({ page }) => {
    await page.goto('/business')
    let posted = false
    await page.route('**/api/business/apply', (route) => {
      posted = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })
    await page.getByRole('button', { name: /Отправить заявку/ }).click()
    // validate() возвращает ошибку организации → тост-предупреждение, запрос НЕ уходит
    // (.first(): текст есть и в aria-live обёртке тоста, и в его заголовке)
    await expect(page.getByText('Укажите название организации').first()).toBeVisible()
    expect(posted, 'POST /api/business/apply не должен уйти').toBe(false)
  })

  test('успешная заявка: серверный приём мокается, показывается экран «Заявка принята»', async ({ page }) => {
    await page.goto('/business')
    // мок серверного приёма — реальной вставки в shop_applications НЕ делаем
    await page.route('**/api/business/apply', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))

    await page.getByPlaceholder('Ваша команда или бренд').fill('E2E Тестовая команда')
    await page.getByPlaceholder('Имя и фамилия').fill('Тест Тестов')
    await page.getByPlaceholder('+7 (700) 000-00-00').fill('+7 700 123 45 67')
    await page.getByPlaceholder('team@company.kz').fill('e2e-team@example.kz')
    await page.getByPlaceholder('brand', { exact: true }).fill('e2e-shop')

    const [req] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/api/business/apply') && r.method() === 'POST'),
      page.getByRole('button', { name: /Отправить заявку/ }).click(),
    ])
    expect(req).toBeTruthy()
    await expect(page.getByText('Заявка принята')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Гарды доступа: гостя не пускает в кабинеты магазина
// ─────────────────────────────────────────────────────────────────────────────
test.describe('B2B — гарды доступа (гость → вход)', () => {
  const GUARDED = ['/shop-admin', '/shop-claim/e2e-fake-token', '/admin/shops']
  for (const path of GUARDED) {
    test(`гость с ${path} уводится на /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/login/i)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Публичная витрина /s/<slug>
// ─────────────────────────────────────────────────────────────────────────────
test.describe('B2B — витрина магазина', () => {
  test('несуществующий магазин отдаёт 404', async ({ page }) => {
    const res = await page.goto('/s/e2e-no-such-shop-404xyz')
    expect(res?.status()).toBe(404)
  })

  // Богатая проверка витрины — только если задан реальный slug (данные грузятся на SSR).
  test.describe('реальный магазин (E2E_SHOP_SLUG)', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!SHOP_SLUG, 'не задан E2E_SHOP_SLUG — пропуск проверок реальной витрины')
      // аналитику витрины в прод НЕ пишем: глушим shop_track (клиентский RPC)
      await page.route('**/rest/v1/rpc/shop_track*', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
      await page.goto(`/s/${SHOP_SLUG}`)
    })

    test('витрина рендерит брендовую шапку и контент (товары либо пустое состояние)', async ({ page }) => {
      await expect(page.getByText('на INKMADE')).toBeVisible()
      const cards = page.locator('article')
      const empty = page.getByText('Магазин наполняется')
      const closed = page.getByText('Закрытый магазин')
      // одно из трёх состояний должно присутствовать
      const shown = (await cards.count()) > 0 || (await empty.count()) > 0 || (await closed.count()) > 0
      expect(shown, 'витрина показала товары / пустое / закрытое состояние').toBe(true)
    })

    test('добавление товара в корзину (если есть доступный товар)', async ({ page }) => {
      const addBtn = page.getByRole('button', { name: 'В корзину' })
      const n = await addBtn.count()
      test.skip(!n, 'в витрине нет доступных к покупке товаров')
      await addBtn.first().click()
      // корзина локальная (localStorage) — заказ НЕ создаётся; ждём тост подтверждения
      await expect(page.getByText(/в корзине/i)).toBeVisible()
    })

    test('быстрый просмотр товара открывается по клику на карточку', async ({ page }) => {
      const cardBtn = page.locator('article button[aria-label]')
      const n = await cardBtn.count()
      test.skip(!n, 'в витрине нет карточек товаров')
      await cardBtn.first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Админ-очередь заявок и управление магазинами /admin/shops
// ─────────────────────────────────────────────────────────────────────────────
test.describe('B2B — админ-очередь /admin/shops', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'нет E2E_ADMIN_EMAIL/PASSWORD')
    await login(page, ADMIN.email!, ADMIN.password!)
  })

  test('страница очереди рендерится: заголовок + переключатель разделов', async ({ page }) => {
    await page.goto('/admin/shops')
    await expect(page.getByText('Заявки на открытие магазина')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Заявки' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Магазины' })).toBeVisible()
  })

  test('раздел «Магазины» переключается (список или пустое состояние)', async ({ page }) => {
    await page.goto('/admin/shops')
    await page.getByRole('button', { name: 'Магазины' }).click()
    // страница жива и показывает магазины либо пустое состояние
    const cards = page.locator('div.rounded-xl')
    const empty = page.getByText('Магазинов пока нет')
    const ok = (await cards.count()) > 0 || (await empty.count()) > 0
    expect(ok).toBe(true)
  })

  test('одобрение заявки создаёт магазин (RPC admin_create_shop мокается)', async ({ page }) => {
    // мок создания магазина + best-effort письма — в прод ничего НЕ пишем
    await page.route('**/rest/v1/rpc/admin_create_shop*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'e2e-shop-id', slug: 'e2e-mock-shop', claim_token: null, owner_id: 'e2e-owner' }),
      }))
    await page.route('**/api/admin/shops/send-claim', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: false }) }))

    await page.goto('/admin/shops')

    // Одобрять есть что только при наличии заявки в статусе «Новая»
    const card = page.locator('div.rounded-xl').filter({ has: page.getByRole('button', { name: 'Одобрить' }) }).first()
    const has = await card.count()
    test.skip(!has, 'нет заявок в статусе «Новая» для одобрения')

    // slug обязателен — заполняем первый текстовый инпут карточки (адрес магазина)
    await card.locator('input:not([type="number"])').first().fill('e2e-mock-shop')

    const [req] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/rpc/admin_create_shop') && r.method() === 'POST'),
      card.getByRole('button', { name: 'Одобрить' }).click(),
    ])
    expect(req).toBeTruthy()
  })
})
