// Режет логотип-надпись (wordmark) из векторного мастера дизайнера.
// Запуск: npm run logo
//
// Мастер — public/media/wordmark.svg. ОДНА фигура в ОДНУ заливку, без обводки.
// Отсюда оба варианта получаются перекраской (см. VARIANTS):
//   light — буквы bone #F3F0EB   → кладём на ТЁМНЫЙ фон (шапка, футер, error, auth-борт)
//   dark  — буквы ink-black      → кладём на СВЕТЛЫЙ фон (кабинеты, shop-admin, designer)
// Имя = цвет самих букв, не цвет фона под ними.
//
// Прежде мастеров было два (wordmark-{dark,light}.svg): та надпись была рукописной, с
// обводкой, и варианты меняли буквы с обводкой цветами местами — перекраской одного
// файла это не выражалось. У нынешней надписи обводки нет, поэтому второй мастер снят:
// два файла одной формы неизбежно разъезжаются при переэкспорте.
//
// Почему скриптом, а не руками: мастер = экспорт дизайнера, его НЕ правим. Переэкспорт
// надписи не должен требовать ручной возни с viewBox — перегенерил, и всё сошлось.
//
// Что делает скрипт:
//  1. Обрезает viewBox по фактическим границам букв. В экспорте надпись висит в центре
//     пустого холста 1440×810 и занимает ~1273×144 — 84% кадра воздух. В <img> такой
//     файл отрисовался бы мелким и не прижатым к своему боксу.
//     Границы МЕРЯЕМ РЕНДЕРОМ, а не парсингом path: контрольные точки безье лежат
//     снаружи кривой и дают bbox с запасом.
//  2. Гонит через svgo с точностью 1 знак. Потерь не видно — 0.1 единицы при ширине
//     кадра ~1275 это сотые доли пикселя на любом реальном кегле.
//
// Размер кадра печатается в лог. Он же должен стоять в width/height у каждого <img> с
// лого (шапка, футер, error, auth, UiAppLogo): атрибуты резервируют место до загрузки и
// держат пропорцию — разъедутся с кадром, получим CLS и кривую ширину.

import sharp from 'sharp'
import { optimize } from 'svgo'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public/media/wordmark.svg')
const OUT = join(ROOT, 'public')

// Заливка в мастере. Ищем её точное значение, а не «любой fill»: промахнёмся —
// вариант молча уедет в цвет мастера, и это заметно только глазом на проде.
const MASTER_FILL = '#f3f0eb'
// Цвет букв каждого варианта — канонические токены из app/assets/css/main.css.
// dark берёт ink-black: светлые layout'ы (account, shop-admin, designer) ставят
// себе text-ink-black, и лого должно попадать с этим текстом в один тон.
const VARIANTS = {
  light: '#f3f0eb', // --color-ink-bone
  dark: '#080b0d', // --color-ink-black
}
// Воздух по краям кадра. Нужен только чтобы округление координат в svgo (±0.05)
// не срезало крайний пиксель буквы. Больше не нужно — отступы задаёт вёрстка.
const PAD = 1

/** Подменяет атрибуты корневого <svg>: и для замерочного рендера, и для итогового кадра. */
function withSvgAttrs(svg, { width, height, viewBox }) {
  const open = svg.match(/^<svg\b[^>]*>/)
  if (!open) throw new Error('gen-logo: не найден корневой <svg> — мастер битый?')
  return svg.replace(
    open[0],
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`
    + ` width="${width}" height="${height}" viewBox="${viewBox}">`,
  )
}

/** Границы непрозрачных пикселей в координатах viewBox мастера. */
async function measure(svg) {
  const vb = svg.match(/viewBox="([-\d.\s]+)"/)
  if (!vb) throw new Error('gen-logo: у мастера нет viewBox')
  const [vx, vy, vw, vh] = vb[1].trim().split(/\s+/).map(Number)
  // Рендерим 1 единица = 1 пиксель, тогда обрезка сразу даёт координаты viewBox.
  const probe = withSvgAttrs(svg, { width: Math.round(vw), height: Math.round(vh), viewBox: vb[1] })
  const { info } = await sharp(Buffer.from(probe))
    .trim({ threshold: 0 })
    .toBuffer({ resolveWithObject: true })
  return {
    x: vx - info.trimOffsetLeft,
    y: vy - info.trimOffsetTop,
    w: info.width,
    h: info.height,
  }
}

const master = readFileSync(SRC, 'utf8')
if (!master.includes(MASTER_FILL)) {
  throw new Error(
    `gen-logo: в мастере нет заливки ${MASTER_FILL}. Похоже, надпись переэкспортирована в `
    + 'другом цвете — сверь MASTER_FILL с фактическим fill в public/media/wordmark.svg.',
  )
}

// Геометрия у вариантов общая (отличается только цвет), поэтому меряем один раз.
const b = await measure(master)
const W = b.w + PAD * 2
const H = b.h + PAD * 2
const x = +(b.x - PAD).toFixed(2)
const y = +(b.y - PAD).toFixed(2)

for (const [name, fill] of Object.entries(VARIANTS)) {
  const framed = withSvgAttrs(master, { width: W, height: H, viewBox: `${x} ${y} ${W} ${H}` })
  const { data } = optimize(framed.replaceAll(MASTER_FILL, fill), {
    multipass: true,
    floatPrecision: 1,
    plugins: [{ name: 'preset-default', params: { overrides: { convertPathData: { transformPrecision: 3 } } } }],
  })

  writeFileSync(join(OUT, `logo-${name}.svg`), data)
  const kb = s => (Buffer.byteLength(s) / 1024).toFixed(1)
  console.log(`logo-${name}.svg  ${W}×${H}  буквы ${fill}  ${kb(master)}кб → ${kb(data)}кб`)
}

console.log(
  `\nКадр ${W}×${H} (${(W / H).toFixed(2)}:1). Этот размер должен стоять в width/height`
  + ` у каждого <img> с лого — иначе CLS и кривая ширина.`,
)
