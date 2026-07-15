// Режет весь набор иконок из мастер-файла знака (public/media/icon.png).
// Запуск: npm run icons
//
// Почему скриптом, а не руками в редакторе: размеры должны пересчитываться из одного
// источника. Поменялся знак — перегенерил, и favicon/apple-touch/PWA не разъехались.
//
// Ключевые решения (см. docs/LANDING_MEDIA_BRIEF.md §0.1):
//  - мелкие размеры режутся плотным кропом по bbox знака: в мастере поля ~17%, при прямом
//    ресайзе в 32px надпись «INK» схлопывается в пятно;
//  - apple-touch — умеренный кроп: iOS сам скругляет углы, нужен воздух;
//  - maskable — знак вписан в safe-circle ⌀80%, чтобы маска Android ничего не срезала.

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public/media/icon.png')
const OUT = join(ROOT, 'public')
// Фон мастера — ровно бренд-бордо, совпадает с theme_color в nuxt.config.ts.
const BG = { r: 0x7a, g: 0x1f, b: 0x28, alpha: 1 }

// --- bbox знака: пиксели, отличающиеся от сплошного фона ---
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
let minX = W
let minY = H
let maxX = 0
let maxY = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C
    const delta =
      Math.abs(data[i] - BG.r) + Math.abs(data[i + 1] - BG.g) + Math.abs(data[i + 2] - BG.b)
    if (delta > 40) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
const bw = maxX - minX + 1
const bh = maxY - minY + 1
const cx = minX + bw / 2
const cy = minY + bh / 2
console.log(`мастер ${W}x${H} · bbox знака ${bw}x${bh} @ (${minX},${minY})`)

/** Квадратный кроп по центру знака; pad — доля поля от длинной стороны знака. */
function squareCrop(pad) {
  const side = Math.min(W, H, Math.round(Math.max(bw, bh) * (1 + pad * 2)))
  return {
    left: Math.max(0, Math.min(W - side, Math.round(cx - side / 2))),
    top: Math.max(0, Math.min(H - side, Math.round(cy - side / 2))),
    width: side,
    height: side,
  }
}

// Знак — 3 плоских цвета + тень, поэтому palette даёт кратную экономию без потерь на глаз.
const png = (pipe) => pipe.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })

async function save(pipe, name) {
  const buf = await png(pipe).toBuffer()
  writeFileSync(join(OUT, name), buf)
  console.log(`  ${name.padEnd(24)} ${String(Math.round(buf.length / 102.4) / 10).padStart(6)} KB`)
}

// 1. Мелкие фавиконы — плотный кроп.
const tight = () => sharp(SRC).extract(squareCrop(0.1))
await save(tight().resize(32, 32, { kernel: 'lanczos3' }), 'favicon-32.png')
await save(tight().resize(192, 192, { kernel: 'lanczos3' }), 'favicon-192.png')

// 2. favicon.ico — контейнер с PNG-полезной нагрузкой (16/32/48), понимают все живые браузеры.
const ICO_SIZES = [16, 32, 48]
const frames = {}
for (const s of ICO_SIZES) {
  frames[s] = await png(tight().resize(s, s, { kernel: 'lanczos3' })).toBuffer()
}
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(ICO_SIZES.length, 4)
let offset = 6 + ICO_SIZES.length * 16
const entries = ICO_SIZES.map((s) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(s, 0) // width
  e.writeUInt8(s, 1) // height
  e.writeUInt16LE(1, 4) // color planes
  e.writeUInt16LE(32, 6) // bpp
  e.writeUInt32LE(frames[s].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += frames[s].length
  return e
})
const ico = Buffer.concat([header, ...entries, ...ICO_SIZES.map((s) => frames[s])])
writeFileSync(join(OUT, 'favicon.ico'), ico)
console.log(
  `  ${'favicon.ico'.padEnd(24)} ${String(Math.round(ico.length / 102.4) / 10).padStart(6)} KB  (16/32/48)`,
)

// 3. apple-touch — умеренный кроп под скругление iOS.
await save(
  sharp(SRC).extract(squareCrop(0.22)).resize(180, 180, { kernel: 'lanczos3' }),
  'apple-touch-icon.png',
)

// 4. PWA purpose:any — полный кадр, поля мастера здесь как раз уместны.
await save(sharp(SRC).resize(192, 192, { kernel: 'lanczos3' }), 'icon-192.png')
await save(sharp(SRC).resize(512, 512, { kernel: 'lanczos3' }), 'icon-512.png')

// 5. PWA purpose:maskable — Android режет по кругу ⌀80% холста. Вписываем знак целиком
// (по диагонали bbox) в этот круг: под любой формой маски ничего не срежется.
const SIDE = 512
const scale = (SIDE * 0.8) / Math.hypot(bw, bh)
const mw = Math.round(bw * scale)
const mh = Math.round(bh * scale)
const mark = await sharp(SRC)
  .extract({ left: minX, top: minY, width: bw, height: bh })
  .resize(mw, mh, { kernel: 'lanczos3' })
  .toBuffer()
await save(
  sharp({ create: { width: SIDE, height: SIDE, channels: 4, background: BG } }).composite([
    { input: mark, left: Math.round((SIDE - mw) / 2), top: Math.round((SIDE - mh) / 2) },
  ]),
  'icon-maskable-512.png',
)
console.log(
  `  maskable: знак ${mw}x${mh} = ${Math.round((mh / SIDE) * 100)}% холста, вписан в ⌀${SIDE * 0.8}`,
)
