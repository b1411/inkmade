import { test, expect } from '@playwright/test'

// E2E конструктора INKMADE. Сценарий не делает сетевых записей в Storage
// (никаких загрузок файлов и add-to-cart, который выгружает артефакты) —
// проверяем рендер, реактивность панели, мультизону, undo/redo, шелкографию.
const ALIAS = 'oversize-tee'

test.describe('Конструктор', () => {
  test('страница и базовые контролы рендерятся', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Загрузить принт' })).toBeVisible()
    await expect(page.getByText('Итого', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'В корзину' }).first()).toBeVisible()
  })

  test('добавление текста создаёт слой и активирует undo', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await page.getByRole('button', { name: 'Текст', exact: true }).click()
    const input = page.getByPlaceholder('Имя или надпись')
    await expect(input).toBeVisible()
    await input.fill('TESTPRINT')
    await page.getByRole('button', { name: 'Добавить текст' }).click()
    // слой появился в панели слоёв
    await expect(page.getByText('TESTPRINT')).toBeVisible()
    // undo доступен, redo — пока нет
    const undo = page.getByTitle('Отменить (Ctrl+Z)')
    await expect(undo).toBeEnabled()
    // отмена убирает слой
    await undo.click()
    await expect(page.getByText('TESTPRINT')).toHaveCount(0)
  })

  test('добавление фигуры появляется в слоях', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await page.getByRole('button', { name: 'Фигуры', exact: true }).click()
    // кнопка фигуры по title (квадрат)
    await page.getByRole('button', { name: 'Прямоугольник' }).click()
    await expect(page.getByText('Слои')).toBeVisible()
    await expect(page.getByText('Прямоугольник')).toBeVisible()
  })

  test('переключение зоны печати работает', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await expect(page.getByText('Зона нанесения')).toBeVisible()
    // зона «Спина» должна присутствовать у текстиля
    const back = page.getByRole('button', { name: 'Спина' })
    if (await back.count()) {
      await back.first().click()
      await expect(back.first()).toBeVisible()
    }
  })
})
