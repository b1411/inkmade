// Готовит кадры hero из мастеров в public/media/hero/_src в форматы и имена,
// которые ждёт спека §10.4/§19: hero-home-{desktop,mobile}-v01.{avif,webp}.
//
// Запуск: npm run hero
//
// Почему скрипт, а не «положить файл руками»: мастера — PNG на 16 МБ. Отдать такой
// в hero = убить LCP (§29 требует ≤2.5 с), а он ещё и preload с fetchpriority=high.
// AVIF/WebP по §10.4 + ресайз до размеров мастера дают тот же кадр в сотнях КБ.
//
// Desktop и mobile — РАЗНЫЕ композиции, а не кроп одного кадра: §27 прямо это
// требует, и §10.4 задаёт им разные сюжеты (на мобильном модели в верхних 58–62%).
// Поэтому пары «источник → цель» заданы явно, а не по маске.
import sharp from 'sharp'
import { mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Мастера лежат ВНЕ public: всё в public Nuxt отдаёт наружу, а это PNG на 16 МБ.
// И вне git — по той же причине, что и остальные фото-исходники (см. .gitignore):
// репозиторий не место для мастеров, git их даже не сожмёт.
const SRC_DIR = 'design/hero'
const OUT_DIR = 'public/media/hero'

// Целевые размеры — мастера из §10.4. Апскейл запрещён (withoutEnlargement):
// растянутый кадр выглядит мылом, лучше отдать честное меньшее разрешение.
const TARGETS = [
  { src: 'hero-home-desktop.png', out: 'hero-home-desktop-v01', width: 2560, height: 1440 },
  { src: 'hero-home-mobile.png', out: 'hero-home-mobile-v01', width: 1536, height: 1920 },
]

if (!existsSync(SRC_DIR)) {
  console.error(`Нет папки ${SRC_DIR}. Положите туда мастера: ${TARGETS.map(t => t.src).join(', ')}`)
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })
const present = await readdir(SRC_DIR)

for (const t of TARGETS) {
  if (!present.includes(t.src)) {
    console.warn(`пропуск: ${t.src} не найден в ${SRC_DIR}`)
    continue
  }
  const input = join(SRC_DIR, t.src)
  const meta = await sharp(input).metadata()

  const base = sharp(input).resize(t.width, t.height, {
    fit: 'cover',
    withoutEnlargement: true,
  })

  // AVIF первым в <picture>, WebP — фолбэк (§10.4). q для AVIF ниже: при равном
  // визуальном качестве он заметно легче.
  await base.clone().avif({ quality: 62 }).toFile(join(OUT_DIR, `${t.out}.avif`))
  await base.clone().webp({ quality: 80 }).toFile(join(OUT_DIR, `${t.out}.webp`))

  const outMeta = await sharp(join(OUT_DIR, `${t.out}.webp`)).metadata()
  const note = meta.width < t.width ? `  ⚠ мастер ${meta.width}px уже целевых ${t.width}px — без апскейла` : ''
  console.log(`${t.out}: ${meta.width}x${meta.height} → ${outMeta.width}x${outMeta.height}${note}`)
}

