import { readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sharp from 'sharp'

const roots = process.argv.slice(2)

if (!roots.length) {
  console.error('Usage: node scripts/optimize-generated-media.mjs <dir> [...dir]')
  process.exit(1)
}

async function walk(path) {
  const info = await stat(path)
  if (info.isFile()) return [path]
  const entries = await readdir(path)
  const nested = await Promise.all(entries.map(entry => walk(join(path, entry))))
  return nested.flat()
}

for (const root of roots) {
  const files = (await walk(root)).filter(file => extname(file).toLowerCase() === '.png')
  for (const file of files) {
    const stem = file.slice(0, -4)
    await sharp(file).webp({ quality: 84, effort: 5 }).toFile(`${stem}.webp`)
    await sharp(file).avif({ quality: 58, effort: 5 }).toFile(`${stem}.avif`)
    console.log(file)
  }
}
