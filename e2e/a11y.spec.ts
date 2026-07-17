import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/catalog', '/business', '/login', '/register', '/legal', '/legal/privacy']

for (const route of ROUTES) {
  test(`${route} passes automated WCAG 2.2 A/AA`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' })
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(result.violations, result.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([])
  })
}

test('keyboard focus remains visible through primary navigation', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  const outline = await focused.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow }
  })
  expect(outline.outline !== 'none' || outline.width !== '0px' || outline.shadow !== 'none').toBeTruthy()
})
