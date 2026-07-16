import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
})
const errors = []

page.on('pageerror', error => errors.push(error.message))

async function settlePage() {
  await page.waitForTimeout(3500)
  const consent = page.getByRole('button', { name: /принять|accept/i })
  if (await consent.count()) await consent.first().click().catch(() => {})
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 70))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1500)
}

await page.goto('http://[::1]:3100', {
  waitUntil: 'domcontentloaded',
  timeout: 90_000
})
await settlePage()
await page.screenshot({ path: '.nuxt/home-redesign-1440.png', fullPage: true })

const desktop = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  width: document.documentElement.scrollWidth,
  productLinks: document.querySelectorAll('a[href^="/product/"]').length,
  brokenImages: [...document.images]
    .filter(image => !image.complete || image.naturalWidth === 0)
    .map(image => image.currentSrc || image.src)
}))

await page.setViewportSize({ width: 390, height: 844 })
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
await settlePage()
await page.screenshot({ path: '.nuxt/home-redesign-390.png', fullPage: true })

const mobile = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  width: document.documentElement.scrollWidth,
  brokenImages: [...document.images]
    .filter(image => !image.complete || image.naturalWidth === 0)
    .map(image => image.currentSrc || image.src)
}))

console.log(JSON.stringify({ desktop, mobile, errors }, null, 2))
await browser.close()
