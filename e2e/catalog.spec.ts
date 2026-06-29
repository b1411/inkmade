import { test, expect } from '@playwright/test'

// Каталог и карточка товара. Читает реальные (прод) данные — без мутаций.
// Навигация по категории/товару условна: зависит от наполнения каталога.
test.describe('Каталог', () => {
  test('страница каталога рендерит заголовок', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('переход в категорию открывает листинг', async ({ page }) => {
    await page.goto('/catalog')
    const firstCategory = page.locator('a[href^="/catalog/"]').first()
    test.skip(!(await firstCategory.count()), 'в каталоге нет категорий')
    await firstCategory.click()
    await expect(page).toHaveURL(/\/catalog\/.+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('переход на карточку товара рендерит страницу товара', async ({ page }) => {
    await page.goto('/catalog')
    const firstCategory = page.locator('a[href^="/catalog/"]').first()
    test.skip(!(await firstCategory.count()), 'в каталоге нет категорий')
    await firstCategory.click()
    await page.waitForURL(/\/catalog\/.+/)

    const firstProduct = page.locator('a[href^="/product/"]').first()
    test.skip(!(await firstProduct.count()), 'в категории нет товаров')
    await firstProduct.click()
    await expect(page).toHaveURL(/\/product\/.+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
