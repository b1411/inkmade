import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// E2E проверка СНЯТОГО DPI-гейта: низкое разрешение должно ПРИНИМАТЬСЯ (раньше
// блокировалось), показывать DPI-бейдж и предупреждение, а не отказ. Делает
// реальную запись в Storage (бакет design-uploads разрешает анонимную вставку).
const ALIAS = 'tshirt'
const here = dirname(fileURLToPath(import.meta.url))
const LOWRES = resolve(here, 'fixtures', 'lowres.png')

test.describe('Загрузка принта', () => {
  test('низкое разрешение ПРИНИМАЕТСЯ (DPI больше не блокирует)', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await expect(page.locator('.customizer-dark')).toHaveAttribute('data-ready', 'true')
    await page.getByRole('button', { name: 'advanced', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Загрузить принт' })).toBeVisible()

    // кладём файл в скрытый input (минуя системный диалог)
    await page.locator('input[type="file"]').first().setInputFiles(LOWRES)

    // ГЛАВНОЕ: низкий DPI ПРИНЯТ — в панели слоёв появился загруженный принт
    // (проверяем устойчивое состояние, а не исчезающий тост)
    await expect(page.getByText('Слои')).toBeVisible()
    await expect(page.getByText('Загруженный принт')).toBeVisible()

    // живой DPI-бейдж в инспекторе автоматически выбранного принта
    await expect(page.getByText(/\d+\s*DPI/).first()).toBeVisible()

    // отказа быть не должно
    await expect(page.getByText('Файл отклонён')).toHaveCount(0)
  })

  test('подсказка форматов перечисляет HEIC и PDF', async ({ page }) => {
    await page.goto(`/customize/${ALIAS}`)
    await expect(page.locator('.customizer-dark')).toHaveAttribute('data-ready', 'true')
    await expect(page.getByText(/HEIC/).first()).toBeVisible()
    await expect(page.getByText(/PDF/).first()).toBeVisible()
  })
})
