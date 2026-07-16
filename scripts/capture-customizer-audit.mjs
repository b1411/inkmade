import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function snapshot(width, height, path) {
  await page.setViewportSize({ width, height })
  await page.goto('http://localhost:3100/customize/tshirt', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForFunction(() => document.body.textContent?.includes('4 990'), { timeout: 15_000 }).catch(() => {})
  await page.locator('.konvajs-content canvas').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(800)
  const consent = page.getByRole('button', { name: /принять|accept/i })
  if (await consent.count()) await consent.first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: true })
  return page.evaluate(() => ({
    url: location.href,
    title: document.title,
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.currentSrc || image.src),
    buttons: [...document.querySelectorAll('button')].map(button => button.textContent?.trim()).filter(Boolean)
  }))
}

const desktop = await snapshot(1440, 900, '.nuxt/customizer-1440.png')
const advanced = page.getByRole('button', { name: 'advanced', exact: true })
if (await advanced.count()) {
  await advanced.first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: '.nuxt/customizer-advanced-1440.png', fullPage: true })
}
const mobile = await snapshot(390, 844, '.nuxt/customizer-390.png')
console.log(JSON.stringify({ desktop, mobile, errors }, null, 2))
await browser.close()
