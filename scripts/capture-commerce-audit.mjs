import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function visit(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForTimeout(1500)
  const consent = page.getByRole('button', { name: /принять|accept/i })
  if (await consent.count()) await consent.first().click().catch(() => {})
  await page.waitForTimeout(300)
}

async function metrics() {
  return page.evaluate(() => ({
    url: location.href,
    title: document.title,
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    brokenImages: [...document.images]
      .filter(image => !image.complete || image.naturalWidth === 0)
      .map(image => image.currentSrc || image.src),
    heading: document.querySelector('h1')?.textContent?.trim() || ''
  }))
}

await visit('http://localhost:3100/catalog')
await page.screenshot({ path: '.nuxt/catalog-1440.png', fullPage: true })
const catalog = await metrics()
const categoryHref = await page.locator('a[href^="/catalog/"]').first().getAttribute('href')

let category = null
let product = null

if (categoryHref) {
  await visit(`http://localhost:3100${categoryHref}`)
  await page.screenshot({ path: '.nuxt/category-1440.png', fullPage: true })
  category = await metrics()
  const productHref = await page.locator('a[href^="/product/"]').first().getAttribute('href')

  if (productHref) {
    await visit(`http://localhost:3100${productHref}`)
    await page.screenshot({ path: '.nuxt/product-1440.png', fullPage: true })
    product = await metrics()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '.nuxt/product-390.png', fullPage: true })
    product.mobile = await metrics()
  }
}

console.log(JSON.stringify({ catalog, categoryHref, category, product, errors }, null, 2))
await browser.close()
