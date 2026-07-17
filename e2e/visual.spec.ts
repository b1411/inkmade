import { test, expect } from '@playwright/test'

/**
 * Визуальные regression-снимки (спека §30): без них нельзя подтвердить «точно как
 * в макете». Брейкпоинты — из §22.7.
 *
 * ВАЖНО — прайминг прокруткой. Секции лендинга появляются через UiReveal
 * (ScrollTrigger). fullPage-скриншот НЕ прокручивает страницу, поэтому всё ниже
 * первого экрана остаётся непроявленным, и baseline запекает пустые полосы.
 * primeReveals() прокручивает страницу до низа и возвращает наверх, чтобы снимок
 * поймал реальный вид. Убрать этот шаг = получить «зелёный» тест на пустой странице.
 *
 * Baseline не согласован, пока идёт перевод на dark editorial (hero и структура
 * главной меняются в Фазах 2–3). До этого снимки будут переутверждаться каждую
 * фазу — это ожидаемо, а не признак поломки. Допустимый diff фиксируем после §30.
 */

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
]

async function primeReveals(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 200))
    }
    window.scrollTo(0, 0)
    await new Promise(r => setTimeout(r, 400))
  })
  await page.waitForTimeout(800)
}

for (const vp of VIEWPORTS) {
  test(`home visual @${vp.name}`, async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'visual baselines are canonicalized in Chromium')
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await primeReveals(page)
    await expect(page).toHaveScreenshot(`home-${vp.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    })
  })
}
