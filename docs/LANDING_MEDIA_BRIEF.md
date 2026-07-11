# INKMADE — Медиа-бриф и генеративный техзадачник (весь сайт)

Полный список визуала по всему продукту: **что** нужно, **где** появляется, **в каком размере**,
и — главное — **готовый промт на генерацию** + **рекомендация модели** по каждому ассету.
Цель: чтобы все изображения и видео были в **едином стиле** и формировали цельное премиум-видение,
а не набор случайно красивых картинок.

> **Заточено под davinci.ai** (мульти-модельный воркспейс). Учтены: реальный список моделей,
> форматы **пресетами** (не пиксели), reference-картинка для консистентности, встроенный редактор
> (удаление фона/upscale). Где нужный формат не совпадает с пресетом davinci — указан пресет + кроп.

> Файл исторически называется `LANDING_*`, но покрывает **весь сайт** (бренд/мета, лендинг,
> каталог, товар, конструктор, аккаунт, B2B-магазины, шаринг). На него ссылаются код и заметки —
> имя не меняем.

> **Промты — на английском.** Так стабильнее во всех моделях davinci (Flux/Ideogram/Imagen/GPT Image).
> Nano Banana понимает и русский, но английский даёт лучший результат. Над каждым промтом —
> короткое русское пояснение намерения. Копируешь блок в ``` — вставляешь в davinci.

---

## §0. АРТ-ДИРЕКЦИЯ — единая ДНК всех ассетов (читать первым)

Это «библия стиля». Каждый промт ниже уже включает её сжатую версию (`[STYLE]`), но понимать
её нужно целиком — тогда даже свои промты будешь писать в стиле.

**Бренд:** INKMADE — merch-студия печати по требованию, Алматы. Позиционирование:
премиальный **стрит-минимализм**, «дорого, но не пафосно». Уверенно, спокойно, без крика.

**Палитра (строго):**
- Бордо `#7A1F28` — главный акцент
- Крем `#EFE0C1` — тёплый светлый фон
- Графит-чёрный `#111` — драма, текст
- Тёплый белый `#FBF8F2` — воздух
- Акцент только бордо. Никаких посторонних ярких цветов вне принтов на изделиях.

**Свет:** мягкий, рассеянный, направленный (как из большого окна). Плавные тени, **без жёстких
контрастных теней**. Много воздуха и негативного пространства.

**Фактура/оптика:** матовое покрытие, тонкое плёночное зерно (film grain), лёгкая аналоговая
несовершенность. Средний формат, тональность Kodak Portra, эстетика fashion-лукбука. Объектив
35–50 мм, умеренно малая глубина резкости.

**Фоны:** нейтральная кремовая/светло-серая штукатурка ИЛИ драматичный тёмный бордо/чёрный.

**Табу:** стоковая «улыбка в камеру», чужие логотипы/бренды, водяные знаки, текст (кроме
явно указанных случаев), пересвет/HDR, кислотная насыщенность, пластиковая кожа.

**Честность (не нарушать):** AI можно для **фонов, атмосферы, OG, знаков, принтов**. AI **нельзя**
для фото конкретных товаров (нужно честное фото реального изделия) и для «реальных клиентов»
(UGC-лиц, выдаваемых за настоящих). Эти пункты помечены 📷.

### `[STYLE]` — единый суффикс (добавляй в КОНЕЦ каждого промта на картинку)
Здесь уже вшиты «негативы» (no text/logo/watermark…), поэтому отдельное поле negative prompt в
davinci не обязательно.
```
— INKMADE house style: premium street-minimalism, Almaty merch studio; strict palette deep burgundy #7A1F28, warm cream #EFE0C1, graphite #111, warm white #FBF8F2; soft diffused directional light, gentle falloff, no harsh shadows, lots of negative space; matte finish, fine film grain, medium-format editorial look, Kodak Portra color tonality; understated luxury, calm and confident mood; no text, no logos, no watermark, no HDR, no oversaturation.
```

### Negative prompt — ТОЛЬКО если у выбранной модели davinci есть отдельное поле
```
text, watermark, signature, brand logos, extra fingers, deformed hands, plastic skin, waxy skin, HDR, oversaturated, neon colors, cluttered background, stock-photo cliché, harsh flash, lowres, jpeg artifacts, blurry, distorted proportions
```

---

## §0.1. КАК УДЕРЖАТЬ ЕДИНЫЙ СТИЛЬ (самое важное — на davinci это делается reference-картинкой)

Один и тот же суффикс не гарантирует единство. Механика на davinci:

1. **Сначала сгенерь ОДИН «style anchor»** — эталонный кадр (рекомендую `hero-bg`). Утверди его.
   Он задаёт свет/зерно/тон для всего остального.
2. **Дальше используй его как reference.** У davinci есть «Upload reference images to keep style,
   characters, and brand consistent across an entire project» и режим **Image-to-Image**:
   - Загружай anchor в поле reference/style на каждой следующей генерации.
   - В промт добавляй строку: `match the lighting, film grain, color grade and mood of the reference image`.
   - Для консистентных лиц/персонажей в серии — модель **Ideogram V3 Character**.
3. **Держи серию на одной модели** (методы ×3, UGC ×6, категории ×5) — не меняй модель внутри серии,
   меняй только описание объекта. Если davinci показывает **seed** — зафиксируй его на серию.
4. **Единый постпроцесс:** прогони весь набор через один пресет (зерно + тёплый Portra-грейд +
   лёгкий бордо-тинт в тенях). Это финально «сшивает» серию. Затем сжать (TinyPNG/Squoosh).

---

## §0.2. МОДЕЛИ davinci.ai — что чем генерить (актуальный роутинг)

Доступные на davinci модели картинок: **Nano Banana Pro, Nano Banana, Flux.2 Pro / Pro Edit / Dev /
Flash / Turbo, Imagen 4 / Imagen 4 Ultra, Seedream 4.5, GPT Image 1.5 / 1 Mini, Ideogram V3 /
V3 Character, Kling 3.0 Image, Grok Imagine, Z-Image Turbo, LTX 2.0 Pro**.

| Задача | На davinci бери | Почему |
|---|---|---|
| Атмосфера/фоны/лукбук (фотореализм) | **Flux.2 Pro** · **Imagen 4 Ultra** · **Seedream 4.5** | максимум фактуры и «дорогого» света |
| Продукт/изделие, консистентность объекта | **Nano Banana** · **Seedream 4.5** · **GPT Image 1.5** | держат объект между кадрами, точная инструкция |
| Постеры/OG/баннеры с ТЕКСТОМ | **Nano Banana Pro** · **Ideogram V3** | лучший рендер текста (в т.ч. кириллица), 2K |
| Принты (типографика/стрит-арт) | **Ideogram V3** (+ **V3 Character** для серии) | текст-в-графике; прозрачность → удалить фон встроенным редактором |
| Логотип-знак / favicon / иконки | **Ideogram V3** или **Nano Banana Pro** (raster) → векторизация вне davinci | чёткий знак + текст; SVG доводишь в Figma/vectorizer |
| Макро-фактура печати | **Flux.2 Pro** · **Seedream 4.5** | тонкие волокна/фактура ткани |
| Правки: убрать фон, ретушь, свет, upscale | встроенный **AI Image Editor** davinci | не отдельная модель — инструмент поверх результата |
| Короткое атмосферное видео-лупы | **Veo 3.1** · **Kling 2.6 Pro** · **Sora 2** | 5–8 сек, стабильная камера, image-to-video |
| Скринкаст конструктора | **экранная запись** (не генерация) | это реальный UI, см. §2 |

> На davinci **нет** Midjourney и Recraft. Их роль закрывают: атмосфера → Flux.2 Pro / Imagen 4 Ultra;
> вектор/лого → Ideogram V3 → векторизация вне сервиса.

---

## §0.3. ФОРМАТЫ davinci (пресеты) → как мапить наши размеры

davinci даёт формат **пресетами**, а не точными пикселями: **1:1, 16:9, 9:16, 4:3, 3:4, 2:1, 1:2**.
Генеришь по ближайшему пресету, затем **кропишь/ресайзишь до точного размера** в редакторе
(или встроенным upscale davinci).

| Нужный итог (в коде) | Пресет davinci | Действие |
|---|---|---|
| 4:5 — hero.main, UGC, категории | **3:4** | генерь 3:4 → кроп до 4:5 (или оставь: слот `object-cover` докропит сам) |
| 1.91:1 — OG-карточки | **2:1** | генерь 2:1 → кроп до 1200×630 |
| 1.9:1 — баннер магазина | **2:1** | генерь 2:1 → ресайз до 1600×840 |
| 16:9 — hero-bg | **16:9** | как есть → ресайз до 2400×1350 |
| 4:3 — методы | **4:3** | как есть → ресайз до 1200×900 |
| 9:16 — auth, hero-видео | **9:16** | как есть → 1080×1920 |
| 1:1 — эскизы принтов, лого | **1:1** | как есть → 600×600 / 512² |
| ~0.85:1 — мокап зоны | **3:4** | генерь 3:4 → лёгкий кроп |

---

# 🔴 БЛОК 0 — Бренд и мета

Что уже залито в `public/` (✅) и что осталось:

| Файл | Статус | Подключение |
|---|---|---|
| `public/favicon.svg` | ✅ есть | nuxt.config.ts |
| `public/apple-touch-icon.png` | ✅ есть | nuxt.config.ts |
| `public/og-default.jpg` (1200×630) | ✅ есть | app.vue (глоб. OG + логотип JSON-LD) |
| `public/favicon.ico` | ❌ нет | нужно добавить `{ rel:'icon', href:'/favicon.ico' }` |
| `public/icons/icon-192.png` · `icon-512.png` + manifest | ❌ нет | PWA не подключён (опц.) |
| `public/og/og-business.jpg` | ❌ нет | своя OG для `/business` (сейчас берёт дефолт) |
| `public/logo-mark.svg` | ❌ нет (опц.) | знак для упаковки/печати |

### 0.1 Логотип-знак / favicon — формат **1:1** · модель **Ideogram V3** (или Nano Banana Pro)
**Намерение:** монограмма-знак, читается в 16px, кремовый на бордо. Мотив — капля чернил (ink drop),
переходящая в букву «I» / монограмму «IM».
```
A minimalist premium logo mark: a single ink drop morphing into a bold letter "I" / "IM" monogram, cream #EFE0C1 shape on a solid deep burgundy #7A1F28 background, perfectly centered, flat vector style, thick confident strokes, high contrast, readable at 16px, geometric and clean, subtle matte texture, no gradients, no extra text besides the monogram, streetwear branding aesthetic.
```
- **davinci:** Ideogram V3, формат 1:1. Затем векторизуй вне davinci (Figma / vectorizer.ai) → SVG.
- Экспорт: `favicon.svg`, `favicon.ico` (32/16), `apple-touch-icon.png` 180×180, `icon-192/512.png`.

### 0.2 OG default (улучшить) — формат **2:1** → кроп 1200×630 · модель **Nano Banana Pro** / Ideogram V3
**Намерение:** превью в Telegram/WhatsApp. Бордо-фон + зерно, крупно «INKMADE», слоган.
```
Social share OG card, horizontal 2:1. Deep burgundy #7A1F28 textured background with fine film grain and a soft cream light glow in the upper-left. Large bold cream-white wordmark "INKMADE" centered, streetwear stencil vibe. Beneath it a smaller elegant tagline "Твой принт. Твоя вещь." in warm cream. Bottom edge: tiny uppercase tag "merch studio · almaty" in muted cream. Premium, minimal, lots of negative space, matte finish, crisp accurate typography.
```
- **davinci:** Nano Banana Pro (лучший текст + кириллица) или Ideogram V3. **Проверь кириллицу** слогана; при браке — генерь фон отдельно, текст добавь в редакторе.

### 0.3 OG для B2B `/business` — формат **2:1** → кроп 1200×630 · модель **Nano Banana Pro** / Ideogram V3
```
Social share OG card, 2:1. Split premium layout: left side deep burgundy #7A1F28 with a bold cream headline "INKMADE для команд", right side a clean cream mock storefront card floating with soft shadow. Fine grain, matte, understated luxury, warm cream and burgundy palette, generous negative space, crisp accurate typography, no clutter.
```
- Файл: `public/og/og-business.jpg`. Прописать `ogImage` в business.vue.

---

# 🔴 БЛОК 1 — Hero лендинга (переделываешь целиком)

Hero сейчас использует **два** визуала. Оба под замену.

### 1.1 `hero-bg.jpg` — фон-лукбук (⭐ сделай это STYLE ANCHOR первым) — формат **16:9** · модель **Flux.2 Pro / Imagen 4 Ultra**
**Где:** `Hero.vue:117`, фон всего блока, размывается blur 3px + `mix-blend-luminosity` + бордо-тинт →
резкость не критична, критичны **свет/тон/композиция**. Итог: **2400×1350**, JPG.
```
Editorial street-fashion lookbook wide shot, 16:9. A small group of stylish young people wearing plain oversized custom streetwear (tees, hoodies) in cream, graphite and burgundy tones, standing in a minimalist Almaty city setting at golden dusk. Soft diffused directional light, deep atmospheric shadows in burgundy-graphite, cinematic but calm mood, shallow depth of field, medium-format film look, heavy Kodak Portra grain, muted warm palette, faces relaxed and candid (not smiling at camera), lots of negative space, matte finish. [STYLE]
```
- **davinci:** Flux.2 Pro или Imagen 4 Ultra, формат 16:9. Утверди первым — это ANCHOR для всего сайта.

### 1.2 `hero.main` — главное изделие в «галерейной» рамке — формат **3:4** → кроп 4:5 · модель **Nano Banana**
**Где:** `Hero.vue:161`, слот `hero.main`. Итог: **1200×1500**, PNG.
```
Premium product hero shot, vertical 3:4. A single oversized streetwear t-shirt (or hoodie) with a bold artistic graphic print, displayed on an invisible ghost-mannequin, floating centered against a dramatic deep burgundy #7A1F28 studio backdrop with soft gradient falloff. Soft diffused studio light from upper left, gentle shadow, matte fabric texture visible, fine film grain, editorial catalog quality, sharp on the garment, lots of clean space around it. [STYLE]
```
- **davinci:** Nano Banana (продукт) + anchor как reference. Формат 3:4 → кроп до 4:5.
- 📷 Идеал на будущее — честное фото реального изделия (двойной кроп, см. Блок 3/7).

### 1.3 `hero.loop` — атмосферное видео (опц. альтернатива статике) — формат **9:16** · модель **Veo 3.1 / Kling 2.6 Pro**
**Файл:** `public/media/hero/hero-loop.mp4` + постер `hero-poster.jpg` · **4:5→9:16, ≤6 сек, ≤4 МБ, без звука, петля.**
```
Cinematic slow loop, vertical, 5 seconds. Extreme slow-motion of a burgundy streetwear hoodie fabric gently rippling in soft wind, dramatic dark studio, single soft light sweeping across the matte texture, floating dust particles, film grain, calm premium mood, seamless loop, no text. [STYLE]
```
- **davinci (видео):** Veo 3.1 или Kling 2.6 Pro, 9:16 (можно image-to-video из `hero.main`). Постер — стоп-кадр.

---

# 🔴 БЛОК 2 — Конструктор: видео-демо ⭐ (главный дифференциатор)

### 2.1 `constructor.demo` — экранная запись (НЕ генерация) 📹
**Где:** слот `constructor.demo`, `Constructor.vue`. **4:3, ~1600×1200, ≤10 сек, ≤5 МБ, без звука.**
Файл: `public/media/constructor/demo.mp4` + постер `demo-poster.jpg`.
**Это реальный UI** — davinci тут не поможет. Сценарий записи (screencast):
1. Открыт товар в конструкторе → загрузка картинки-принта.
2. Перетаскивание принта в зону → масштаб/поворот.
3. Смена цвета изделия → силуэт перекрашивается.
4. Цена пересчитывается на глазах.
- **Как снять:** OBS / QuickTime / ScreenStudio (плавные зумы). Затем сжать (Handbrake, H.264, без звука).
- Постер — красивый кадр с готовой композицией.

---

# 🔴 БЛОК 3 — Методы печати: 3 макро-фото — формат **4:3** · модель **Flux.2 Pro / Seedream 4.5** 🎨/📷

**Где:** слоты `method.dtg/dtf/sublimation`, `Methods.vue`. Секция **тёмная**. Итог: **1200×900**, JPG.
Генерь **одной серией на одной модели** (единый свет/фон, меняется только фактура; seed фикс, если есть).

### 3.1 `method.dtg` — DTG (краска в волокна)
```
Macro close-up photograph, 4:3. Extreme detail of vibrant full-color ink absorbed into soft cotton fibers of a t-shirt, showing how the print becomes part of the fabric, dramatic dark burgundy-black background, single soft raking light revealing fiber texture, shallow depth of field, premium, film grain, matte. [STYLE]
```
### 3.2 `method.dtf` — DTF (плотный яркий перенос)
```
Macro close-up photograph, 4:3. Extreme detail of a bright dense DTF transfer print sitting crisply on top of dark fabric, slightly raised tactile texture, saturated but controlled colors, dramatic dark burgundy-black background, single soft raking light, shallow depth of field, premium, film grain, matte. [STYLE]
```
### 3.3 `method.sublimation` — сублимация (принт по всей поверхности)
```
Macro close-up photograph, 4:3. Detail of an all-over sublimation print flowing seamlessly across polyester fabric with no visible edges or borders, colors fused into the material, dramatic dark burgundy-black background, single soft raking light showing subtle weave, shallow depth of field, premium, film grain, matte. [STYLE]
```
- **davinci:** Flux.2 Pro или Seedream 4.5 (макро), формат 4:3, одна модель на все три.
- 📷 В идеале — реальное макро своей печати; AI-версия допустима как старт.

---

# 🟡 БЛОК 4 — Соц-доказательство «Носят INKMADE» ⭐ — формат **3:4**→4:5 · модель **Flux.2 Pro / Nano Banana** 📷 (AI — только плейсхолдер)

**Где:** слоты `ugc.1…6`, `SocialProof.vue`. Итог: **1000×1250**, JPG. Минимум для старта — 4.
**Честность:** это «реальные клиенты». Правильно — **настоящие фото/отметки клиентов**. AI тут = обман,
если выдавать за реальных людей. Для временного плейсхолдера генерь **обезличенные** лайфстайл-кадры
одной серией (anchor как reference):
```
Candid street lifestyle photo, vertical 3:4. A person wearing plain custom INKMADE streetwear in an everyday Almaty setting (street, cafe, courtyard), natural relaxed pose, cropped or partial face / from behind / side angle to stay anonymous, warm cream and burgundy tones, soft overcast daylight, authentic "shot on phone but tasteful" vibe, subtle film grain, matte, no posing at camera. [STYLE]
```
- **davinci:** Flux.2 Pro или Nano Banana, формат 3:4, один reference, разные ракурсы. Пометь как placeholder → заменяй реальными.

---

# 🟢 БЛОК 5 — Auth-визуал (вход/регистрация) — формат **9:16** · модель **Flux.2 Pro / Imagen 4 Ultra** 🎨

**Где:** слот `auth.visual`, `layouts/auth.vue`, левая панель. Итог: **1080×1920**, JPG.
**Намерение:** тёмная атмосферная вертикаль — цех/печать/изделие крупно. (Хороший второй ANCHOR.)
```
Atmospheric vertical shot, 9:16. Moody dark print studio scene: a burgundy garment on a rack or a printing press detail in soft focus, deep graphite-burgundy shadows, a single warm cream light source, cinematic and quiet, premium craftsmanship feel, heavy film grain, shallow depth of field, lots of dark negative space for overlaying a login form, matte finish, no text. [STYLE]
```
- **davinci:** Flux.2 Pro / Imagen 4 Ultra, формат 9:16.

---

# 🟢 БЛОК 6 — Категории «Выбери основу» (секция на паузе) — формат **3:4**→4:5 · модель **Nano Banana** 🎨/📷

**Где:** слоты `category.tshirt/hoodie/sweatshirt/cap/bag`. Секция **скрыта, пока категорий < 3**
(`index.vue:79`), и сейчас рендерит **иконку**, не эти слоты. Готовить **в последнюю очередь**.
Итог: **1000×1250**, PNG, изделие по центру на светлом. Одна серия, единый свет:
```
Clean product catalog photo, vertical 3:4. A single plain [t-shirt / hoodie / sweatshirt / cap / tote bag] in warm cream or graphite color, neatly presented (folded or on invisible mannequin), centered on a seamless warm cream #EFE0C1 background, soft even studio light, subtle shadow, matte fabric, minimal, premium e-commerce look, fine grain. [STYLE]
```
- **davinci:** Nano Banana (продукт), меняй только тип изделия, одна модель/seed на серию.

---

# 🟢 БЛОК 7 — Каталог и товар (основной объём, через админку) 📷

Грузится в админке в Supabase Storage (`product_images`: `kind`, `color_hex`, `is_primary`, `label`).
**Это должно быть честное фото реального изделия — не AI.**

> ⚠️ **Двойной кроп:** одно фото = **4:5** в каталоге (плитка) и **1:1** на странице товара (квадрат
> + зум-лупа). Снимай с запасом, изделие **по центру**. Мастер: **квадрат ≥ 1500×1500**.

- **7.1 Основное (`kind='mockup'`)** — по возможности **на каждый цвет** (`color_hex`). Нейтральный
  фон (крем/светло-серый), мягкий свет, резкость.
- **7.2 Lifestyle (`kind='lifestyle'`)** — изделие на модели, street-контекст. Питает галерею
  «примеров» на лендинге (`LandingExamplesMarquee`).
- **7.3 Миниатюры** — генерятся сами (64px). Готовить не нужно.

> AI-опция только для **демо-товаров/визуального заполнения витрины на старте** (не выдавать за
> реальный ассортимент). Если нужно — промт 1.2/6, davinci Nano Banana.

---

# 🟢 БЛОК 8 — Принт-библиотека (готовые принты) — формат **1:1** (или под арт) · модель **Ideogram V3** 🎨 ⭐

**Где:** таблица `print_library` (`file_url` + опц. `thumbnail_url`), грузятся в админке. Ровно то,
ради чего брался генеративный сервис.
- **Принт:** PNG с **прозрачным фоном**. Итог: длинная сторона **≥ 2000 px** (300 DPI на размер зоны).
- **Эскиз `thumbnail_url`:** **1:1, 600×600**, на нейтральном фоне (`object-cover` в модалке).

**Как получить прозрачный фон на davinci:** генерь принт на **плоском контрастном фоне**
(например ровный крем), затем прогони через встроенный **AI Image Editor → Remove Background** → PNG.

Пример-затравки (генерь сериями по темам, потом ручная доводка):
```
Bold streetwear graphic print, centered on a flat solid cream #EFE0C1 background (for easy background removal), high resolution. [СЮЖЕТ: напр. "grunge typographic slogan", "abstract ink splatter emblem", "brutalist geometric monogram", "hand-drawn graffiti lettering"]. Limited palette of deep burgundy #7A1F28, cream #EFE0C1 and graphite #111, high-contrast, screen-print / stencil aesthetic, crisp clean edges, print-ready, no mockup, just the artwork.
```
- **davinci:** **Ideogram V3** (леттеринг/текст, в т.ч. кириллица) · **V3 Character** для серий с
  повторяющимся персонажем · сложная графика — Nano Banana Pro. Фон → Remove Background.

---

# 🟢 БЛОК 9 — B2B-магазины (НОВОЕ)

Витрина `/s/[slug]` (`s/[slug]/index.vue`) — **арендаторский** визуал, грузит владелец в
`shop-admin/branding.vue`. Тебе нужно: **(A)** дефолты/шаблон для владельцев, **(B)** красивый
**демо-магазин INKMADE** как живой пример для продаж B2B.

| Поле | Что | Итог | Пресет davinci |
|---|---|---|---|
| `shop.logo_url` | Лого в шапке (высота ~36px) | 512×512 или 240×72 | 1:1 |
| `shop.hero.banner_url` | Фон hero витрины **+ OG магазина** | **1600×840** | 2:1 → ресайз |
| `it.preview_url` | Превью товара (3:4) | — скрин холста, генерится сам | — |

### 9.1 Демо-магазин INKMADE — баннер — формат **2:1** → 1600×840 · модель **Nano Banana Pro / Flux.2 Pro**
```
Wide brand banner for a merch storefront hero, 2:1. Deep burgundy #7A1F28 to graphite gradient with fine grain, a subtle folded streetwear garment or ink-texture motif on the right third, clean cream negative space on the left for a headline overlay, soft cinematic light, premium minimal, matte, no text. [STYLE]
```
- Слева накладывается заголовок → держи зону чистой. Затемнение регулируется в UI (`hero.overlay`).

### 9.2 Шаблоны логотипов для арендаторов — формат **1:1** · модель **Ideogram V3**
Дай владельцам 3–4 нейтральных пресета-заглушки, чтобы витрина не пустовала:
```
Minimal abstract brand logo mark, flat vector style, single accent color on a plain white background, geometric, modern, versatile for a merch shop, no text, centered, clean. (then Remove Background → PNG)
```

---

# 🟢 БЛОК 10 — Конструктор: мокап зоны печати (опц. апгрейд) — формат **3:4** · модель **Nano Banana** 🎨/📷

**Где:** `print_zones.mockup_url` — реальный мокап изделия, на который накладывается принт
(opacity ~0.55). **Фронт (и бэк для задней зоны)**, строго фронтально, без перспективы. Итог ≥ **920×1080**.
```
Flat front-facing product mockup, straight-on, no perspective, portrait. A plain [t-shirt/hoodie] in a solid neutral color, perfectly centered and symmetrical on a seamless light background, even flat studio light, no distracting wrinkles over the print area, clean technical catalog style, matte fabric. [STYLE]
```
- **davinci:** Nano Banana (продукт), формат 3:4. По одному на изделие (можно на цвет).

---

# ✅ Что НЕ требует ассетов (генерится/дефолт)

Силуэт изделия в конструкторе (SVG по цвету) · аватары (инициалы на бордо-градиенте) ·
пустые состояния (иконки Lucide в медальоне) · превью сохранённых дизайнов (`designs.preview_url` —
скрин холста) · OG страницы товара (берёт фото товара, иначе `og-default.jpg`) · OG шаринга дизайна
(`/design/[token]` — авто-превью холста) · миниатюры товара (из фото). Блок дизайнеров скрыт
фиче-флагом (`designerMarketplace`) — слоты `designers.*` **не готовим**.

---

# 📊 Сводная таблица (davinci)

| Ассет | Слот/источник | Тип | Пресет→итог | AI? | davinci-модель |
|---|---|---|---|---|---|
| Логотип-знак/favicon | `public/favicon.*`,`icons/*` | вектор/PNG | 1:1 → 512² | 🎨 | Ideogram V3 →вектор |
| OG default | `public/og-default.jpg` | JPG | 2:1 → 1200×630 | 🎨 | Nano Banana Pro |
| OG business | `public/og/og-business.jpg` | JPG | 2:1 → 1200×630 | 🎨 | Nano Banana Pro |
| Hero фон (ANCHOR) | `hero-bg.jpg` | JPG | 16:9 → 2400×1350 | 🎨 | Flux.2 Pro / Imagen 4 Ultra |
| Hero main | `hero.main` | PNG | 3:4 → 4:5 1200×1500 | 🎨/📷 | Nano Banana |
| Hero видео (опц.) | `hero.loop` | MP4+постер | 9:16 ≤6с/4МБ | 🎨 | Veo 3.1 / Kling 2.6 |
| Конструктор демо ⭐ | `constructor.demo` | MP4+постер | 4:3 ≤5МБ | 📹 запись | OBS/ScreenStudio |
| Методы ×3 | `method.*` | JPG | 4:3 → 1200×900 | 🎨/📷 | Flux.2 Pro / Seedream 4.5 |
| UGC ×6 ⭐ | `ugc.1…6` | JPG | 3:4 → 1000×1250 | 📷 (AI=плейсхолдер) | Flux.2 Pro / Nano Banana |
| Auth визуал | `auth.visual` | JPG | 9:16 → 1080×1920 | 🎨 | Flux.2 Pro / Imagen 4 Ultra |
| Категории ×5 (пауза) | `category.*` | PNG | 3:4 → 1000×1250 | 🎨/📷 | Nano Banana |
| Фото товара | админка `product_images` | JPG/PNG | квадрат→4:5+1:1 ≥1500² | 📷 | камера |
| Мокап зоны (опц.) | `print_zones.mockup_url` | PNG/JPG | 3:4 ≥920×1080 | 🎨/📷 | Nano Banana |
| Принты библиотеки ⭐ | `print_library.file_url` | PNG прозр. | 1:1 ≥2000px | 🎨 | Ideogram V3 → Remove BG |
| Эскиз принта | `print_library.thumbnail_url` | JPG/PNG | 1:1 → 600×600 | 🎨 | Ideogram V3 |
| Демо-магазин баннер | `shop.hero.banner_url` | JPG | 2:1 → 1600×840 | 🎨 | Nano Banana Pro / Flux.2 Pro |
| Магазин лого | `shop.logo_url` | PNG/SVG | 1:1 → 512² | 🎨 | Ideogram V3 |

**Видео:** MP4 H.264, без звука, авто-петля, + постер JPG того же ratio.
**Прозрачный фон / вырез:** генерь на плоском фоне → davinci Remove Background → PNG.
**Сцены/макро/UGC:** JPG ~80%.

---

# 📁 Целевая структура `public/`

```
public/
├── favicon.svg            ✅   favicon.ico ❌   apple-touch-icon.png ✅
├── og-default.jpg         ✅
├── icons/                 ❌   icon-192.png · icon-512.png (PWA, опц.)
├── og/                    ❌   og-business.jpg
├── logo-mark.svg          ❌   (опц.)
└── media/
    ├── hero/         hero-bg.jpg ✅(апгрейд) · hero-main.png ❌ · hero-loop.mp4/poster ❌(опц.)
    ├── constructor/  demo.mp4 · demo-poster.jpg   ❌ (запись)
    ├── methods/      dtg.jpg · dtf.jpg · sublimation.jpg   ❌
    ├── social/       ugc-1.jpg … ugc-6.jpg   ❌
    ├── categories/   tshirt/hoodie/sweatshirt/cap/bag.png   ❌ (пауза)
    └── auth/         auth-visual.jpg   ❌
```
(Фото товаров, принты библиотеки и брендинг магазинов грузятся через админку в Supabase Storage.)

---

# 🚀 Порядок работ (первая партия — по твоему выбору)

**Шаг 0 (обязательно первым): STYLE ANCHOR.** Сгенерь `hero-bg.jpg` (§1.1, Flux.2 Pro / Imagen 4 Ultra,
16:9) — утверди свет/зерно/тон. Дальше всё генеришь, **загружая его как reference** (см. §0.1).
Второй anchor — `auth.visual` (§5).

1. **🔴 Бренд-мета** — логотип-знак (§0.1, Ideogram V3) → favicon-набор, apple-touch, PWA-иконки;
   OG default (§0.2), OG business (§0.3) — Nano Banana Pro.
2. **🔴 hero-bg + auth.visual** — два anchor-кадра, задают стиль всему сайту.
3. **🟢 Принты библиотеки** (§8, Ideogram V3 → Remove Background) — сериями по темам.
4. **🟢 Демо-магазин B2B** (§9) — лого (Ideogram V3) + баннер (Nano Banana Pro) как живой пример.

**Дальше:** hero.main → методы ×3 → UGC (плейсхолдеры) → категории (когда вернём секцию) →
мокапы зон. Фото реальных товаров — камерой, параллельно.

> После каждой партии — единый постпроцесс (§0.1 п.4) и сжатие. Подключение: файл в `public/<src>` →
> снять `pending: true` у слота в `app/config/media.ts` → готово.
