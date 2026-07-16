import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function capture(width, height, path) {
  await page.setViewportSize({ width, height })
  await page.goto('http://localhost:3100/business', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForTimeout(1200)
  const consent = page.getByRole('button', { name: /принять|accept/i })
  if (await consent.count()) await consent.first().click().catch(() => {})
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
  if (width === 1440) await page.locator('section').first().screenshot({ path: '.nuxt/business-hero-1440.png' })
  await page.screenshot({ path, fullPage: true })
  return page.evaluate(() => ({
    status: document.querySelector('h1')?.textContent?.trim() || '',
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.currentSrc || image.src),
    heroImage: (() => {
      const image = document.querySelector('section img')
      if (!image) return null
      const style = getComputedStyle(image)
      return { src: image.currentSrc, naturalWidth: image.naturalWidth, opacity: style.opacity, display: style.display, visibility: style.visibility, position: style.position, zIndex: style.zIndex }
    })()
  }))
}

const desktop = await capture(1440, 900, '.nuxt/business-1440.png')
const mobile = await capture(390, 844, '.nuxt/business-390.png')
console.log(JSON.stringify({ desktop, mobile, errors }, null, 2))
await browser.close()
