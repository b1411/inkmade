import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sharp from 'sharp'

const folders = [
  join(process.cwd(), 'public', 'media', 'models'),
  join(process.cwd(), 'public', 'media', 'campaigns'),
  join(process.cwd(), 'public', 'media', 'products', 'detail'),
]

for (const folder of folders) {
  const files = (await readdir(folder)).filter(file => extname(file).toLowerCase() === '.png' && file.includes('-v02'))
  for (const file of files) {
    const source = join(folder, file)
    const base = source.slice(0, -4)
    const pipeline = sharp(source).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    await Promise.all([
      pipeline.clone().webp({ quality: 86, effort: 5 }).toFile(`${base}.webp`),
      pipeline.clone().avif({ quality: 58, effort: 5 }).toFile(`${base}.avif`),
    ])
    const meta = await sharp(source).metadata()
    console.log(`✓ ${file}: ${meta.width}×${meta.height}`)
  }
}
