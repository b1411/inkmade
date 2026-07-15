// Режет логотип-надпись (wordmark) из векторных мастеров дизайнера.
// Запуск: npm run logo
//
// Мастера — public/media/wordmark-{dark,light}.svg. Это ОДНА и та же надпись в двух
// заливках (см. §0.1a docs/LANDING_MEDIA_BRIEF.md):
//   dark  — буквы #111111 (ink-black) в кремовой обводке → кладём на СВЕТЛЫЙ фон
//   light — буквы #efe0c1 (ink-cream) в чёрной обводке   → кладём на ТЁМНЫЙ фон
// Имя = цвет самих букв, не цвет фона под ними.
//
// Почему скриптом, а не руками: мастер = экспорт дизайнера, его НЕ правим. Переэкспорт
// надписи не должен требовать ручной возни с viewBox — перегенерил, и всё сошлось.
//
// Что делает скрипт:
//  1. Обрезает viewBox по фактическим границам букв. В экспорте надпись висит в центре
//     пустого холста 1440×810 и занимает ~1326×303 — 62% кадра воздух. В <img> такой
//     файл отрисовался бы мелким и не прижатым к своему боксу.
//     Границы МЕРЯЕМ РЕНДЕРОМ, а не парсингом path: контрольные точки безье лежат
//     снаружи кривой и дают bbox с запасом.
//  2. Гонит через svgo с точностью 1 знак: 153кб → ~34кб. Потерь не видно — 0.1 единицы
//     при ширине кадра 1326 это сотые доли пикселя на любом реальном кегле.
//
// Оба варианта получают ОДИН размер кадра, отцентрованный по буквам. Это обязательно:
// шапка кросс-фейдит их друг в друга (тёмный ⇄ светлый при скролле), и кадры,
// разъехавшиеся хотя бы на единицу, дали бы заметный рывок надписи.

import sharp from 'sharp'
import { optimize } from 'svgo'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public/media')
const OUT = join(ROOT, 'public')

const VARIANTS = ['dark', 'light']
// Воздух по краям кадра. Нужен только чтобы округление координат в svgo (±0.05)
// не срезало крайний пиксель обводки. Больше не нужно — отступы задаёт вёрстка.
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

const masters = Object.fromEntries(
  VARIANTS.map(v => [v, readFileSync(join(SRC, `wordmark-${v}.svg`), 'utf8')]),
)
const boxes = Object.fromEntries(
  await Promise.all(VARIANTS.map(async v => [v, await measure(masters[v])])),
)

// Единый кадр на оба варианта — по самому широкому/высокому из них.
const W = Math.max(...VARIANTS.map(v => boxes[v].w)) + PAD * 2
const H = Math.max(...VARIANTS.map(v => boxes[v].h)) + PAD * 2

for (const v of VARIANTS) {
  const b = boxes[v]
  // Кадр фиксированного размера, отцентрованный по буквам этого варианта.
  const x = +(b.x + b.w / 2 - W / 2).toFixed(2)
  const y = +(b.y + b.h / 2 - H / 2).toFixed(2)

  const framed = withSvgAttrs(masters[v], { width: W, height: H, viewBox: `${x} ${y} ${W} ${H}` })
  const { data } = optimize(framed, {
    multipass: true,
    floatPrecision: 1,
    plugins: [{ name: 'preset-default', params: { overrides: { convertPathData: { transformPrecision: 3 } } } }],
  })

  writeFileSync(join(OUT, `logo-${v}.svg`), data)
  const kb = s => (Buffer.byteLength(s) / 1024).toFixed(1)
  console.log(
    `logo-${v}.svg  ${W}×${H}  ${kb(masters[v])}кб → ${kb(data)}кб`
    + `  (буквы ${b.w}×${b.h} @ ${b.x},${b.y})`,
  )
}
