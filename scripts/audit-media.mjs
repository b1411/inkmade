import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import sharp from 'sharp'

const root = join(process.cwd(), 'public', 'media')
const outDir = join(process.cwd(), '.nuxt', 'media-audit')

async function walk(dir) {
  const rows = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const row of rows) {
    const full = join(dir, row.name)
    if (row.isDirectory()) files.push(...await walk(full))
    else if (row.name.endsWith('.webp')) files.push(full)
  }
  return files
}

function groupFor(path) {
  const rel = relative(root, path).replaceAll('\\', '/')
  if (/^(hero|campaigns|auth|workspace)\//.test(rel)) return 'campaign'
  if (rel.startsWith('models/')) return 'product-fit'
  if (/^(ideas|quality)\//.test(rel)) return 'editorial'
  if (rel.startsWith('products/blank/')) return 'product-blank'
  if (rel.startsWith('products/back/')) return 'product-back'
  if (rel.startsWith('products/on-body/')) return 'product-on-body'
  if (/^(products\/detail|categories)\//.test(rel)) return 'product-detail'
  if (rel.startsWith('prints/')) return 'prints'
  return 'other'
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

async function tile(file, width = 260, height = 220) {
  const rel = relative(root, file).replaceAll('\\', '/')
  const image = await sharp(file)
    .resize(width - 20, height - 52, { fit: 'contain', background: '#d9d5ce' })
    .webp({ quality: 86 })
    .toBuffer()
  const label = Buffer.from(`<svg width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#111417"/>
    <text x="10" y="${height - 24}" fill="#f3f0eb" font-family="Arial" font-size="12">${escapeXml(rel)}</text>
  </svg>`)
  return sharp(label).composite([{ input: image, left: 10, top: 10 }]).png().toBuffer()
}

async function sheet(name, files) {
  const cols = Math.min(4, files.length)
  const rows = Math.ceil(files.length / cols)
  const width = 260
  const height = 220
  const tiles = await Promise.all(files.map(file => tile(file, width, height)))
  const canvas = sharp({ create: { width: cols * width, height: rows * height, channels: 3, background: '#080b0d' } })
  await canvas.composite(tiles.map((input, index) => ({
    input,
    left: (index % cols) * width,
    top: Math.floor(index / cols) * height,
  }))).png().toFile(join(outDir, `${name}.png`))
}

await mkdir(outDir, { recursive: true })
const files = (await walk(root)).sort()
const inventory = []
for (const file of files) {
  const meta = await sharp(file).metadata()
  inventory.push({
    file: relative(root, file).replaceAll('\\', '/'),
    group: groupFor(file),
    width: meta.width,
    height: meta.height,
    aspect: Number(((meta.width ?? 1) / (meta.height ?? 1)).toFixed(3)),
  })
}

const groups = Map.groupBy(files, groupFor)
for (const [name, group] of groups) await sheet(name, group)
await writeFile(join(outDir, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`)
console.log(`Audited ${files.length} WebP assets across ${groups.size} groups.`)
for (const [name, group] of groups) console.log(`${name}: ${group.length}`)
