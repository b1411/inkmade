// Режет весь набор иконок из векторного мастера знака (public/media/ink.svg).
// Запуск: npm run icons
//
// Почему скриптом, а не руками в редакторе: размеры должны пересчитываться из одного
// источника. Поменялся знак — перегенерил, и favicon/apple-touch/PWA не разъехались.
//
// Мастер — круглый знак во весь кадр, с прозрачными углами. Отсюда три разных обращения
// с ним (см. docs/LANDING_MEDIA_BRIEF.md §0.1):
//
//  1. Фавиконка — вектор как есть. Круг во весь кадр, ничего не обрезано, прозрачные углы.
//     favicon.svg отдаётся первым: браузер с поддержкой SVG возьмёт его и отрисует чётко
//     на любом размере, .ico остаётся запасным для Safari и старья.
//
//  2. apple-touch — ПЛАШКА БЕЗ АЛЬФЫ. iOS игнорирует прозрачность и заливает её чёрным,
//     поэтому круг кладём на кремовый квадрат. Скруглит iOS сам.
//
//  3. maskable — знак УЖИМАЕТСЯ. Буквы вылезают за safe zone Android (⌀80%): маска
//     срезала бы «INK» по бокам. Считаем реальный радиус самого дальнего пикселя букв и
//     масштабируем круг так, чтобы буквы гарантированно сели внутрь safe zone.
//
// Мастер = экспорт дизайнера, его НЕ правим руками. Единственная правка — воздух вокруг
// букв (ниже) — живёт здесь параметром, чтобы её можно было крутить и откатывать.

import sharp from 'sharp'
import { writeFileSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public/media/ink.svg')
const OUT = join(ROOT, 'public')

const MASTER = 2048
const CREAM = { r: 0xef, g: 0xe0, b: 0xc1, alpha: 1 }
// Android режет по кругу диаметром 80% холста. Всё важное — внутрь.
const SAFE = 0.8
// Запас, чтобы буквы не касались границы safe zone впритык.
const SAFE_MARGIN = 0.96
// Кремовые поля вокруг круга на плитке iOS.
const APPLE_DISC = 0.88

// ── Воздух вокруг букв ───────────────────────────────────────────────────────
// В экспорте буквы упираются в обод: зазор 4% справа, на 16px это 0.63px. «K» сливается
// с ободом, и знак читается обрезанным, хотя не обрезан. Плюс буквы смещены на 21 ед.
// вправо от центра. Даём воздух и центруем — трансформом вокруг центра холста; круг,
// обод и цвета не трогаем. 0.88 = буквы 79% ширины, зазор 10.7% (вариант B).
// Крутить тут: 0.92 — теснее, 0.84 — просторнее.
const LETTER_SCALE = 0.88
// Группа букв в экспорте — единственная с этим transform (круг лежит группой выше).
const LETTERS_GROUP = '<g transform="matrix(1, 0, 0, 1, 84, 278)">'
const VIEWBOX = 1536
// Замеренный центр букв в координатах viewBox (не центр холста — буквы смещены).
const LETTERS_CX = 789.0
const LETTERS_CY = 760.9

function withLetterAir(svgText) {
  if (!svgText.includes(LETTERS_GROUP)) {
    throw new Error(
      'gen-icons: группа букв не найдена в ink.svg. Похоже, знак переэкспортирован и структура ' +
        'изменилась — перепроверь LETTERS_GROUP и замеры LETTERS_CX/CY.',
    )
  }
  const c = VIEWBOX / 2
  return svgText.replace(
    LETTERS_GROUP,
    `<g transform="translate(${c}, ${c}) scale(${LETTER_SCALE}) translate(${-LETTERS_CX}, ${-LETTERS_CY}) matrix(1, 0, 0, 1, 84, 278)">`,
  )
}

const svgFixed = withLetterAir(readFileSync(SRC, 'utf8'))

// Вектор растеризуем один раз в мастер-буфер, дальше режем из него: даёт те же чёткие
// края, что и рендер под каждый размер, но без десятка проходов librsvg.
const master = await sharp(Buffer.from(svgFixed), { density: 300 })
  .resize(MASTER, MASTER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const png = (pipe) => pipe.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
async function save(pipe, name) {
  const buf = await png(pipe).toBuffer()
  writeFileSync(join(OUT, name), buf)
  console.log(`  ${name.padEnd(24)} ${String(Math.round(buf.length / 102.4) / 10).padStart(6)} KB`)
}

// --- Насколько далеко буквы уходят от центра? Считаем по кремовым пикселям. ---
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, channels: C } = info
const c = W / 2
let maxLetterR = 0
let letMinX = W
let letMaxX = 0
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C
    if (data[i + 3] < 16) continue
    const isCream =
      Math.abs(data[i] - CREAM.r) < 40 &&
      Math.abs(data[i + 1] - CREAM.g) < 40 &&
      Math.abs(data[i + 2] - CREAM.b) < 46
    if (!isCream) continue
    if (x < letMinX) letMinX = x
    if (x > letMaxX) letMaxX = x
    const r = Math.hypot(x - c, y - c)
    if (r > maxLetterR) maxLetterR = r
  }
}
const letterPct = ((maxLetterR / c) * 100).toFixed(1)
// Зазор до обода печатаем в лог: если знак переэкспортируют и буквы снова прилипнут,
// это видно сразу здесь, а не через полгода в табе.
const gapPct = ((Math.min(letMinX, W - 1 - letMaxX) / W) * 100).toFixed(1)
console.log(
  `воздух: буквы ${(((letMaxX - letMinX) / W) * 100).toFixed(0)}% ширины · зазор до обода ${gapPct}% · на 16px ${((gapPct / 100) * 16).toFixed(1)}px`,
)
// Во сколько ужать круг, чтобы самый дальний пиксель букв сел в safe zone.
const fit = Math.min(1, (MASTER * SAFE * SAFE_MARGIN) / 2 / maxLetterR)
console.log(
  `мастер ${MASTER}² · буквы уходят на ${letterPct}% радиуса · ужимаем круг до ${(fit * 100).toFixed(0)}% под maskable`,
)

/** Круг заданной доли холста на непрозрачной кремовой плитке. */
async function plate(size, discFraction) {
  const d = Math.round(size * discFraction)
  const disc = await sharp(master).resize(d, d, { kernel: 'lanczos3' }).toBuffer()
  const off = Math.round((size - d) / 2)
  return sharp({ create: { width: size, height: size, channels: 4, background: CREAM } }).composite(
    [{ input: disc, left: off, top: off }],
  )
}

// 1. Фавиконка-вектор — главный источник для таба: чёткая на любом размере.
// Отдаём версию с воздухом, а не сырой мастер: иначе в табе буквы липнут к ободу.
writeFileSync(join(OUT, 'favicon.svg'), svgFixed)
const svgKb = Math.round(statSync(join(OUT, 'favicon.svg')).size / 102.4) / 10
console.log(
  `  ${'favicon.svg'.padEnd(24)} ${String(svgKb).padStart(6)} KB  (вектор, круг во весь кадр)`,
)

// 2. favicon.ico — PNG-кадры 16/32/48 с альфой, запасной вариант для Safari и старых браузеров.
const ICO_SIZES = [16, 32, 48]
const frames = {}
for (const s of ICO_SIZES) {
  frames[s] = await sharp(master)
    .resize(s, s, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer()
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
  `  ${'favicon.ico'.padEnd(24)} ${String(Math.round(ico.length / 102.4) / 10).padStart(6)} KB  (16/32/48, альфа)`,
)

// 3. apple-touch — кремовая плашка без альфы, иначе iOS покрасит углы чёрным.
await save((await plate(180, APPLE_DISC)).flatten({ background: CREAM }), 'apple-touch-icon.png')

// 4. PWA purpose:any — круг с альфой, витрина установки покажет его на своей подложке.
await save(sharp(master).resize(192, 192, { kernel: 'lanczos3' }), 'icon-192.png')
await save(sharp(master).resize(512, 512, { kernel: 'lanczos3' }), 'icon-512.png')

// 5. PWA purpose:maskable — круг ужат так, что буквы внутри safe zone при любой маске.
await save((await plate(512, fit)).flatten({ background: CREAM }), 'icon-maskable-512.png')
console.log(`  maskable: круг ${(fit * 100).toFixed(0)}% холста, буквы в пределах ⌀${SAFE * 100}%`)
