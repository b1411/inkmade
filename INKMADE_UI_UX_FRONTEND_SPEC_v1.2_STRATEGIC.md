# INKMADE — UI/UX, Visual Content & Frontend Specification

**Версия:** 1.2 — стратегически усиленная и подтверждённая  
**Дата проверки и стратегического усиления:** 16 июля 2026  
**Статус:** основной handoff-документ для дизайна и разработки  
**Стек:** Nuxt 4 / Vue 3 / TypeScript / Supabase / Tailwind CSS 4  
**Референс:** `модный_веб_дизайн_inkmade_с_мерчем.png`

---

# 0. Что исправлено после повторной проверки

Версия 1.0 передавала правильное направление, но содержала несколько неточностей. В этой версии исправлено следующее:

1. Уменьшены высоты hero и секций, чтобы сайт соответствовал утверждённому **плотному и компактному** макету, а не выглядел растянутым.
2. Зафиксирована каноническая палитра INKMADE с точными HEX/RGBA и назначением каждого цвета.
3. Для каждого блока указано, какой именно цвет используется для фона, текста, границ, CTA, hover и active.
4. Добавлена полная карта фотографий: сюжет, размер файла, кроп, безопасная зона под текст, одежда и расположение принтов.
5. Исправлены команды установки Nuxt-модулей.
6. Уточнена структура проекта Nuxt 4: клиентский код в `app/`, общий код в `shared/`, серверная логика в `server/`.
7. Уточнено подключение `vue-konva`: только на клиенте, потому что Canvas не должен рендериться на сервере.
8. Для Supabase добавлены обязательные правила RLS и запрет передачи service-role ключа в клиент.
9. Указано, что физические размеры зон печати требуют подтверждения производством для каждой модели изделия.
10. Добавлены визуальные regression-тесты Playwright, без которых нельзя гарантировать точное воспроизведение дизайна.

---

# 1. Позиционирование продукта

INKMADE не должен восприниматься как:

- типография;
- сервис «логотип на футболке»;
- шаблонный интернет-магазин;
- SaaS-конструктор без fashion-составляющей;
- дешёвый рекламный мерч.

INKMADE должен восприниматься как:

> **fashion-tech streetwear studio из Алматы, создающая мерч и кастомную одежду, которую действительно хотят носить.**

Порядок восприятия сайта:

1. **Хочу такую вещь.**
2. **Я могу создать её под себя.**
3. **Основа и печать выглядят дорого.**
4. **Заказать просто и понятно.**
5. **Эта же система может создать сильный мерч для команды или бренда.**

---

# 2. Визуальное направление

## 2.1. Ключевые определения

- dark editorial;
- premium streetwear;
- fashion-tech;
- compact brutalist grid;
- Almaty urban culture;
- минимальные скругления;
- крупная плотная типографика;
- глубокий бордовый как единственный фирменный цветовой акцент;
- чёрный, графитовый, костяной и молочный как основная среда;
- крупный принт — главный визуальный объект;
- фотографии важнее декоративной графики;
- интерфейс выглядит дорого, но не мешает совершить заказ.

## 2.2. Главный принцип плотности

Утверждённый макет **не растянут**.

Нельзя делать:

- hero 700–800 px на стандартном desktop;
- секции с пустыми вертикальными полями по 100–140 px;
- карточки товара высотой 400 px на главной;
- огромные интервалы между блоками;
- отдельный экран под каждую мысль.

Базовый визуальный ритм:

- hero: 460–520 px;
- товарный блок: 280–340 px;
- preview конструктора: 430–520 px;
- компактные светлые блоки: 150–230 px;
- B2B teaser: 230–300 px;
- footer: 220–280 px.

Высоты не должны быть жёстко фиксированы, но команда обязана удерживать эти диапазоны на desktop 1440 px.

---

# 3. Каноническая фирменная палитра

Эти значения являются **официальными цифровыми цветами данного дизайн-направления**. Не брать случайные оттенки пипеткой из JPG-макета.

## 3.1. Основные цвета

| Token | HEX / RGBA | Название | Назначение |
|---|---|---|---|
| `ink-black` | `#080B0D` | Ink Black | Главный фон сайта, header, footer, hero |
| `surface-black` | `#111214` | Surface Black | Тёмные секции, карточные зоны |
| `surface-raised` | `#17181B` | Raised Surface | Конструктор, B2B, поднятые секции |
| `panel` | `#1D1F22` | Panel | Панели управления, input, control cards |
| `panel-hover` | `#24262A` | Panel Hover | Hover тёмных карточек и controls |
| `bone` | `#F3F0EB` | Bone | Главный светлый фон и светлый текст |
| `warm-card` | `#EEE9E1` | Warm Card | Фон карточек товара |
| `paper` | `#F8F6F2` | Paper | Таблицы, документы, самые светлые поверхности |
| `burgundy` | `#7E1F2D` | INKMADE Burgundy | Primary CTA и фирменный акцент |
| `burgundy-hover` | `#96283A` | Burgundy Hover | Hover primary CTA |
| `burgundy-active` | `#651823` | Burgundy Active | Active/pressed и края top bar |
| `burgundy-muted` | `#48151D` | Burgundy Muted | Ненавязчивые фоновые акценты |
| `text-primary` | `#F3F1ED` | Primary Light Text | Основной текст на тёмном |
| `text-secondary` | `#C6C2BC` | Secondary Light Text | Подзаголовки и body на тёмном |
| `text-muted` | `#8E8A84` | Muted Text | Микротекст, inactive |
| `text-dark` | `#0B0D0E` | Primary Dark Text | Текст на светлом |
| `text-dark-soft` | `#4D4A46` | Secondary Dark Text | Body на светлом |
| `line` | `rgba(255,255,255,.10)` | Light Line | Обычные разделители на тёмном |
| `line-strong` | `rgba(255,255,255,.18)` | Strong Light Line | Контролы, secondary borders |
| `line-dark` | `rgba(8,11,13,.14)` | Dark Line | Разделители на светлом |
| `success` | `#6B9278` | Muted Success | Наличие, успешная загрузка |
| `warning` | `#C89A4B` | Muted Warning | Среднее качество файла |
| `error` | `#BC4B56` | Muted Error | Ошибка и низкое качество |

## 3.2. CSS и Tailwind CSS 4 tokens

`app/assets/css/main.css`:

```css
@import "tailwindcss";

@theme {
  --color-ink-black: #080B0D;
  --color-ink-surface: #111214;
  --color-ink-raised: #17181B;
  --color-ink-panel: #1D1F22;
  --color-ink-panel-hover: #24262A;

  --color-ink-bone: #F3F0EB;
  --color-ink-card: #EEE9E1;
  --color-ink-paper: #F8F6F2;

  --color-ink-burgundy: #7E1F2D;
  --color-ink-burgundy-hover: #96283A;
  --color-ink-burgundy-active: #651823;
  --color-ink-burgundy-muted: #48151D;

  --color-ink-text: #F3F1ED;
  --color-ink-text-soft: #C6C2BC;
  --color-ink-text-muted: #8E8A84;
  --color-ink-text-dark: #0B0D0E;
  --color-ink-text-dark-soft: #4D4A46;

  --color-ink-success: #6B9278;
  --color-ink-warning: #C89A4B;
  --color-ink-error: #BC4B56;

  --font-display: "Inter Tight", "Arial Narrow", Arial, sans-serif;
  --font-ui: "Inter", Arial, sans-serif;
}

:root {
  --ink-line: rgba(255, 255, 255, 0.10);
  --ink-line-strong: rgba(255, 255, 255, 0.18);
  --ink-line-dark: rgba(8, 11, 13, 0.14);

  --ink-overlay-hero:
    linear-gradient(
      90deg,
      #080B0D 0%,
      rgba(8, 11, 13, 0.97) 25%,
      rgba(8, 11, 13, 0.76) 43%,
      rgba(8, 11, 13, 0.20) 70%,
      rgba(8, 11, 13, 0.04) 100%
    );
}
```

## 3.3. Где использовать каждый цвет

### `#080B0D — Ink Black`

Использовать:

- `body`;
- header;
- hero background;
- footer;
- полноэкранное mobile menu;
- нижняя mobile navigation;
- фон страницы каталога и карточки товара;
- background fallback при загрузке lifestyle-фотографий.

Не использовать:

- как фон товарных карточек;
- как фон всех панелей конструктора, иначе исчезнет глубина.

### `#111214 — Surface Black`

Использовать:

- секция «Выбери основу»;
- trust strip;
- секция «Премиальное качество»;
- тёмные карточки преимуществ;
- sidebar product page;
- вторичные тёмные контейнеры.

### `#17181B — Raised Surface`

Использовать:

- секция preview конструктора;
- секция «Для команд и брендов»;
- фон полноценного конструктора;
- drawers и bottom sheets;
- выделенные editorial-блоки.

### `#1D1F22 — Panel`

Использовать:

- control panel конструктора;
- tool rail;
- inputs;
- selected dark cards;
- панели цены;
- dropdown;
- modal body.

### `#24262A — Panel Hover`

Использовать только:

- hover тёмных controls;
- hover строки dropdown;
- hover карточки на тёмном фоне;
- keyboard-focused interactive panel.

### `#F3F0EB — Bone`

Использовать:

- светлый фон «Идеи для принта»;
- светлый фон «Как это работает»;
- основной светлый текст на тёмном;
- secondary outline button border;
- selected ring вокруг тёмного swatch;
- icon stroke на тёмном.

### `#EEE9E1 — Warm Card`

Использовать:

- карточки основы;
- карточки рекомендаций;
- product isolated media;
- небольшие commerce-панели на светлом фоне.

Не заменять чистым `#FFFFFF`: чистый белый сделает сайт холодным и дешёвым.

### `#F8F6F2 — Paper`

Использовать:

- размерная таблица;
- юридические документы;
- checkout summary на светлой версии;
- фон печатных материалов;
- самые светлые data-panels.

### `#7E1F2D — INKMADE Burgundy`

Использовать:

- primary CTA;
- selected size;
- selected print zone;
- selected tabs;
- top info bar center;
- cart CTA;
- small badge;
- нумератор секции;
- ссылка с ключевым действием;
- небольшой цветовой фрагмент принта;
- активный пункт mobile nav.

Лимит:

- бордовый не должен занимать более 8–12% видимой площади экрана;
- одновременно на одном экране — не более 2 крупных бордовых объектов.

### `#96283A — Burgundy Hover`

Использовать только для hover/keyboard focus primary CTA и интерактивного бордового элемента.

### `#651823 — Burgundy Active`

Использовать:

- pressed state;
- края top bar gradient;
- dark active badge;
- disabled-dark бордовый фон с уменьшенной opacity.

### `#48151D — Burgundy Muted`

Использовать:

- очень мягкая подсветка за print preview;
- декоративная линия;
- background специального label;
- не использовать для основного текста.

### Текстовые цвета

- `#F3F1ED`: H1, H2 и главный UI на тёмном;
- `#C6C2BC`: body и пояснения на тёмном;
- `#8E8A84`: secondary metadata, inactive;
- `#0B0D0E`: H2 и карточки на светлом;
- `#4D4A46`: body на светлом.

## 3.4. Цветовая карта блоков главной

| Блок | Фон | Заголовок | Body | Border | CTA / Active |
|---|---|---|---|---|---|
| Top bar | Burgundy gradient | Bone | Bone 88% | Нет | Нет |
| Header | Ink Black 96% | Bone | Secondary | Light Line | Burgundy underline |
| Hero | Ink Black + photo | Bone | Secondary | Нет | Burgundy |
| Trust strip | Surface Black | Bone | Secondary | Light Line | Нет |
| Выбери основу | Surface Black | Bone | Secondary | Light Line | Burgundy micro |
| Карточка основы | Warm Card | Text Dark | Dark Soft | Dark Line | Burgundy hover border |
| Конструктор preview | Raised Surface | Bone | Secondary | Light Line | Burgundy |
| Идеи для принта | Bone | Text Dark | Dark Soft | Dark Line | Burgundy text link |
| Как это работает | Bone | Text Dark | Dark Soft | Dark Line | Burgundy number/icon |
| Премиальное качество | Surface Black | Bone | Secondary | Light Line | Burgundy micro |
| Для команд | Raised Surface | Bone | Secondary | Light Line | Burgundy text/button |
| Footer | Ink Black | Bone | Muted | Light Line | Burgundy submit |

---

# 4. Типографика

## 4.1. Реалистичная реализация

### Production default

- Display: `Inter Tight`, weights 700, 800, 900.
- UI/Body: `Inter`, weights 400, 500, 600, 700.

### Premium upgrade

Допускается лицензированный display-шрифт уровня Druk Wide **только после проверки кириллицы и казахских символов**. Нельзя подключать нелицензионный файл.

## 4.2. Размеры

### Desktop 1440+

| Элемент | Размер | Line-height | Weight | Tracking |
|---|---:|---:|---:|---:|
| Hero H1 | 68–80 px | 0.92 | 900 | -0.045em |
| Section H2 | 32–42 px | 0.98 | 800 | -0.035em |
| Compact H2 | 26–32 px | 1.0 | 800 | -0.03em |
| Product title | 13–15 px | 1.1 | 700 | -0.015em |
| Body large | 16–17 px | 1.45 | 400 | -0.01em |
| Body | 14–15 px | 1.5 | 400 | 0 |
| UI label | 11–13 px | 1.2 | 600 | 0.02em |
| Micro | 10–11 px | 1.2 | 600 | 0.06em |
| Price large | 26–30 px | 1.0 | 700 | -0.025em |

### Laptop 1024–1439

- Hero H1: 54–68 px.
- Section H2: 30–38 px.
- Body: 14–16 px.

### Mobile

- Hero H1: `clamp(42px, 12vw, 54px)`;
- Section H2: 27–32 px;
- Body: 14–15 px;
- CTA: 13 px;
- Micro: minimum 10 px.

## 4.3. Правила

- H1/H2 — uppercase.
- Body — обычный регистр.
- H1 hero — максимум 3 строки.
- Не делать body uppercase.
- Не применять `font-weight: 300`.
- Не использовать `letter-spacing` выше `0.08em` для длинного текста.
- В одном блоке максимум 3 уровня шрифтового масштаба.

---

# 5. Сетка и плотность

## 5.1. Breakpoints

```ts
export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1440,
  wide: 1680
} as const
```

## 5.2. Container

```css
.ink-container {
  width: min(calc(100% - 48px), 1440px);
  margin-inline: auto;
}

@media (max-width: 767px) {
  .ink-container {
    width: calc(100% - 32px);
  }
}
```

## 5.3. Grid

Desktop:

- 12 columns;
- gap: 16 px;
- viewport gutter: 24 px;
- wide viewport gutter: 32–40 px.

Tablet:

- 8 columns;
- gap: 14 px;
- gutter: 20 px.

Mobile:

- 4 columns;
- gap: 12 px;
- gutter: 16 px.

## 5.4. Вертикальный ритм

- обычная секция: 48–72 px;
- компактная секция: 24–40 px;
- очень крупная product/editorial секция: максимум 80 px;
- расстояние H2 → body: 12–16 px;
- body → CTA: 24–30 px;
- section label → H2: 12–16 px.

## 5.5. Радиусы

| Элемент | Radius |
|---|---:|
| Primary/secondary button | 2 px |
| Product card | 4 px |
| Dark panel | 6–8 px |
| Canvas | 8 px |
| Modal | 12 px |
| Mobile bottom sheet top | 20 px |
| Hero | 0 px |

---

# 6. UI-компоненты

## 6.1. Primary CTA

Desktop:

- height: 50 px;
- horizontal padding: 22–26 px;
- min-width: 184 px;
- background: Burgundy;
- hover: Burgundy Hover;
- active: Burgundy Active;
- text: 12–13 px, 700, uppercase;
- icon: 16–18 px;
- icon gap: 16 px;
- radius: 2 px.

Mobile:

- height: 50 px;
- full width in hero;
- minimum touch target 50 px.

## 6.2. Secondary CTA

- height: 50 px;
- background: transparent;
- border: 1 px solid `rgba(243,240,235,.46)`;
- text: Bone;
- hover background: `rgba(243,240,235,.05)`;
- hover border: Bone;
- radius: 2 px.

## 6.3. Product card

- media aspect: 4:3;
- background: Warm Card;
- product image area: 70–74%;
- product fills 62–78% of media height;
- info area: 26–30%;
- padding: 12–16 px;
- border: 1 px solid transparent;
- radius: 4 px.

Hover:

- translateY(-3px);
- image scale(1.025);
- border-color `rgba(126,31,45,.45)`;
- duration 220–260 ms.

## 6.4. Focus

```css
:focus-visible {
  outline: 2px solid #96283A;
  outline-offset: 3px;
}
```

---

# 7. Точная структура главной

1. Top info bar.
2. Header.
3. Hero.
4. Trust strip.
5. «Выбери основу».
6. «Создай свой дизайн».
7. «Идеи для твоего принта».
8. «Как это работает».
9. «Премиальное качество».
10. «Для команд и брендов».
11. Footer.

Не добавлять между этими секциями:

- длинный текст «о нас»;
- отзывы без реальных клиентов;
- огромный B2B-блок;
- блог;
- техническое перечисление DTG/DTF;
- форму подписки до footer.

---

# 8. Блок 1 — Top Info Bar

## Desktop

- height: 28–30 px;
- background:
  `linear-gradient(90deg, #651823 0%, #7E1F2D 48%, #651823 100%)`;
- text: Bone, opacity .90;
- size: 10 px;
- weight: 600;
- center.

Text:

`Печать от 1 вещи  •  Алматы  •  Доставка по Казахстану`

Поведение:

- top bar не sticky;
- при скролле уходит вверх;
- header после этого остаётся sticky на `top: 0`.

## Mobile

- height: 28 px;
- font-size: 9 px;
- при ширине < 360 px оставить:
  `От 1 вещи • Алматы • По Казахстану`.

Фото: не требуется.

---

# 9. Блок 2 — Header

## Desktop

- height: 64 px;
- background: `rgba(8,11,13,.96)`;
- border-bottom: Light Line;
- sticky `top: 0`;
- z-index: 60;
- backdrop blur: 12 px.

Layout:

- logo: columns 1–2;
- nav: columns 4–9;
- cart: columns 11–12.

Logo:

- SVG wordmark;
- white/Bone;
- width: 148–164 px;
- height auto.

Navigation:

- 12 px;
- gap 36–44 px;
- inactive: Text Secondary;
- hover: Bone;
- active underline: 1 px Burgundy.

Cart:

- icon 21–22 px;
- label 12 px.

## Mobile

- height: 58–60 px;
- logo width: 126–140 px;
- cart button: 44×44 px;
- menu button: 44×44 px;
- menu: full-screen Ink Black;
- menu links: 30–38 px display font.

Фото: не требуется.

---

# 10. Блок 3 — Hero

## 10.1. Высота

Desktop ≥ 1280:

- target: 480 px;
- allowed range: 460–520 px;
- не делать выше 540 px без отдельного согласования.

Laptop 1024–1279:

- 420–470 px.

Mobile:

- 560–640 px;
- target: 600 px.

## 10.2. Desktop layout

- 12-column grid;
- left text: columns 1–5;
- photo visual: columns 5–12;
- content vertically centered;
- left max-width: 520 px.

Eyebrow:

`MERCH STUDIO · ALMATY`

H1:

```text
МЕРЧ,
КОТОРЫЙ
ХОТЯТ НОСИТЬ
```

Body:

```text
Кастомная одежда и мерч с твоим принтом.
Печать от одной вещи. Премиум-качество.
```

CTA:

- Primary: `СОЗДАТЬ СВОЙ ПРИНТ`
- Secondary: `СМОТРЕТЬ КАТАЛОГ`

## 10.3. Цвета

- fallback background: Ink Black;
- H1: Text Primary;
- body: Text Secondary;
- primary CTA: Burgundy;
- secondary CTA: transparent + Bone border;
- micro-location: Bone 58%;
- photo overlay: `--ink-overlay-hero`.

## 10.4. Фотография hero

### Файл

- desktop: `hero-home-desktop-v01.avif`;
- tablet: `hero-home-tablet-v01.avif`;
- mobile: `hero-home-mobile-v01.avif`.

### Исходные размеры

- desktop master: 2560×1440 px;
- tablet: 2048×1536 px;
- mobile: 1536×1920 px;
- color space: sRGB;
- export AVIF + WebP fallback.

### Сюжет

- 3 модели;
- визуальный возраст 19–28;
- центральноазиатская внешность;
- Алматы, бетонная современная городская среда;
- editorial streetwear;
- серьёзные/нейтральные выражения;
- 2 чёрные oversize-футболки;
- 1 washed charcoal или светло-графитовая футболка;
- принты видны отчётливо.

### Desktop composition

- левая 34–38% ширины кадра остаётся тёмной и визуально спокойной;
- модели находятся в правых 62–66%;
- центральная модель не закрывается H1;
- лица не пересекаются текстом;
- крупные принты не уходят под CTA;
- focal point: примерно `58% 44%`.

### Mobile composition

- отдельная композиция, не automatic crop;
- модели в верхних 58–62%;
- нижние 38–42% затемнены для H1 и кнопок;
- основной принт остаётся видимым над текстом.

### Принты на одежде

Модель слева, back print:

- ширина: 31–34 см;
- высота: 38–44 см;
- top offset: 8–10 см от шва воротника.

Центральная модель, front print:

- ширина: 26–30 см;
- высота: 31–37 см;
- top offset: 9–11 см.

Модель справа, back print:

- ширина: 30–34 см;
- высота: 38–45 см.

Палитра принтов:

- Bone;
- washed grey;
- black;
- Burgundy как акцент максимум 15–20% площади самого принта.

---

# 11. Блок 4 — Trust Strip

## Размер

Desktop:

- height: 46–50 px.

Mobile:

- height: 48 px;
- horizontal scroll.

## Цвета

- background: Surface Black;
- border: Light Line;
- icon: Bone;
- text: Text Secondary;
- hover отсутствует.

Items:

1. Печать от 1 вещи
2. Премиум-материалы
3. Стойкое нанесение
4. Доставка по Казахстану

Фото: не требуется.

---

# 12. Блок 5 — «Выбери основу»

## 12.1. Desktop

- target height: 300 px;
- allowed range: 280–340 px;
- background: Surface Black;
- padding Y: 32–40 px.

Grid:

- intro: 2 columns;
- cards: 10 columns;
- cards: 4 equal items;
- gap: 8 px.

Intro:

- section number Burgundy;
- H2 Bone;
- CTA outline.

Card:

- target height: 218–240 px;
- background Warm Card;
- text Text Dark;
- price Text Dark Soft;
- hover border Burgundy 45%.

## 12.2. Фото товаров

Каждый товар должен быть создан как отдельный чистый asset.

### Общие требования

- source: 1600×1200 px;
- aspect: 4:3;
- sRGB;
- AVIF/WebP;
- фон в файле прозрачный либо Warm Card;
- одинаковый масштаб и освещение;
- мягкая короткая тень максимум 8% opacity;
- никаких принтов.

### Product 1

File: `base-oversize-black-front.avif`

- чёрная oversize-футболка;
- front;
- широкие рукава;
- dropped shoulder;
- occupies 66–72% media height;
- centered, vertical shift -2%.

### Product 2

File: `base-classic-bone-front.avif`

- светлая classic-футболка;
- цвет изделия близок к Bone, но должна отделяться от Warm Card;
- occupies 60–66%.

### Product 3

File: `base-sweatshirt-black-front.avif`

- чёрный свитшот;
- occupies 70–76%;
- рукава полностью видимы.

### Product 4

File: `base-cap-black-three-quarter.avif`

- чёрная кепка;
- three-quarter view;
- occupies 72–78% width.

## 12.3. Mobile

- section padding: 28–34 px 0;
- carousel card width: 158–184 px;
- show 2.1–2.25 cards;
- CSS scroll snap;
- no auto-scroll.

---

# 13. Блок 6 — «Создай свой дизайн»

## 13.1. Desktop

- target height: 470 px;
- allowed range: 430–520 px;
- background: Raised Surface;
- padding Y: 36–48 px.

Grid:

- intro: columns 1–3;
- toolbar: column 4;
- canvas: columns 5–9;
- controls: columns 10–12.

### Intro colors

- H2: Bone;
- body: Text Secondary;
- CTA: Burgundy.

### Tool rail

- width: 64–68 px;
- background: Surface Black;
- border: Light Line;
- button: 60×62 px;
- active left border: 3 px Burgundy;
- active background: Panel;
- icon: Bone;
- inactive label: Text Muted.

### Canvas

- target visible size: 520–640 px wide;
- ratio: 4:3;
- min-height: 320 px;
- max-height: 390 px;
- background:
  `radial-gradient(circle at 50% 45%, #25272B 0%, #17181B 70%)`;
- border: Light Line;
- radius: 8 px.

### Product mockup

File: `constructor-oversize-black-front-transparent.webp`

- source: 1800×1800 px;
- transparent background;
- front;
- no baked print;
- product occupies 60–66% canvas width;
- top offset: 6–8%.

### Example print

File:
`print-alma-city-of-mountains-v01.svg`

- monochrome Bone/grey;
- optional Burgundy detail;
- vector preferred;
- no text distortion.

Visible placement:

- width: 60–66% of chest area;
- UI preview equivalent: 28–31 cm actual width;
- height: 33–38 cm;
- top: 9–11 cm below collar;
- centered.

Важно: физическая зона печати подтверждается производством по конкретной модели. Значения в UI являются стартовой калибровкой, а не универсальной гарантией для всех поставщиков.

### Control panel

- background: Panel;
- border: Light Line;
- width: 280–320 px;
- padding: 16–20 px.

Swatches:

- 24 px;
- gap 8 px;
- selected ring Bone.

Sizes:

- 40–44×34 px;
- active Burgundy;
- inactive Panel with Strong Line.

Price:

- amount Bone;
- price highlight may use Burgundy only in label/line, not full amount.

Cart CTA:

- Burgundy;
- 46–48 px high.

## 13.2. Mobile

- background: Raised Surface;
- canvas ratio: 1:1;
- product width: 72–78%;
- toolbar becomes horizontal;
- advanced controls open bottom sheet;
- primary CTA sticky above bottom navigation;
- total block height depends on content, no forced 900 px section.

---

# 14. Блок 7 — «Идеи для твоего принта»

## Desktop

- target height: 200 px;
- allowed: 180–230 px;
- background: Bone;
- padding Y: 24–32 px;
- H2: Text Dark;
- link: Burgundy;
- cards: 6;
- card ratio: 4:3;
- gap: 8–10 px.

## Фотографии

Source:

- 1200×900 px each;
- 4:3;
- dark editorial;
- text overlay not baked into photo;
- export AVIF.

Files:

1. `idea-mountains-city-v01.avif`
   - Алматы/горы/город;
   - крупный принт на чёрной футболке.

2. `idea-typography-v01.avif`
   - typographic back print;
   - distressed but readable.

3. `idea-culture-v01.avif`
   - современная интерпретация локальной культуры;
   - без сувенирного клише.

4. `idea-abstract-v01.avif`
   - монохромная абстракция;
   - Burgundy detail.

5. `idea-minimal-v01.avif`
   - маленькая надпись или символ;
   - premium negative space.

6. `idea-art-illustration-v01.avif`
   - авторская иллюстрация;
   - крупный placement.

Цвет overlay text:

- Bone;
- background gradient Ink Black 0–70% opacity.

## Mobile

- card width: 150–174 px;
- card height: 116–132 px;
- show 2.2 cards;
- horizontal scroll snap.

---

# 15. Блок 8 — «Как это работает»

## Desktop

- target height: 165 px;
- allowed: 145–190 px;
- background: Bone;
- border-top: Dark Line;
- padding Y: 24–30 px;
- title Text Dark;
- body Dark Soft;
- numbers Burgundy;
- icons Text Dark.

Steps:

1. Выбери основу
2. Создай дизайн
3. Проверь макет
4. Оформи заказ

No photos.

Mobile:

- 2×2 grid;
- each item min-height 118 px;
- connector lines removed.

---

# 16. Блок 9 — «Премиальное качество»

## Desktop

- target height: 210 px;
- allowed: 190–240 px;
- background: Surface Black;
- padding Y: 28–36 px;
- H2 Bone;
- 4 media cards;
- card ratio approx 16:9;
- gap 6–8 px.

## Фото

Source:

- 1400×900 px;
- AVIF;
- macro editorial;
- no stock-photo gloss.

1. `quality-cotton-240gsm-v01.avif`
   - складки чёрного хлопка;
   - side light;
   - фактура видна.

2. `quality-print-texture-v01.avif`
   - close-up стойкого нанесения;
   - размер видимой области ткани 3–6 см;
   - без трещин.

3. `quality-fine-detail-v01.avif`
   - мелкая типографика;
   - резкие края;
   - shallow depth of field.

4. `quality-seam-collar-v01.avif`
   - ворот, ribbing, шов или брендовая label;
   - ощущение премиальной базы.

Overlay text:

- Bone;
- 11 px;
- 16 px inset;
- Ink Black gradient under text.

---

# 17. Блок 10 — «Для команд и брендов»

## Desktop

- target height: 260 px;
- allowed: 230–300 px;
- background: Raised Surface;
- padding Y: 32–40 px.

Grid:

- intro: 3 columns;
- benefits: 5 columns;
- photo: 4 columns.

Colors:

- H2 Bone;
- body Secondary;
- icon Bone;
- section number Burgundy;
- CTA Burgundy or Burgundy text link;
- dividers Light Line.

## Фото

File:
`teams-crew-almaty-back-v01.avif`

Source:

- 2000×1500 px;
- 4:3;
- export AVIF/WebP.

Scene:

- два человека со спины;
- современный городской Алматы;
- black hoodie / black oversize tee;
- один print `CREW`;
- второй — university-style fictional identity;
- не использовать реальные логотипы без разрешения;
- тёмная нейтральная цветокоррекция.

Print placement:

- width: 28–32 cm;
- height: 22–38 cm depending on design;
- top: 10–12 cm below neckline;
- center aligned.

Mobile:

- benefits 2×2;
- photo full-width 16:10;
- image after benefits.

---

# 18. Footer

## Desktop

- target height: 240 px;
- allowed: 220–280 px;
- background: Ink Black;
- border-top: Light Line;
- padding: 42 px 0 20 px;
- 5 columns.

Colors:

- logo Bone;
- headings Bone;
- links Text Secondary;
- micro Text Muted;
- input Panel;
- input border Light Line;
- submit Burgundy.

No lifestyle photo.

---

# 19. Полная карта фотографий

| № | Место | Файл | Source size | Формат | Основной сюжет |
|---:|---|---|---:|---|---|
| 1 | Hero desktop | `hero-home-desktop-v01` | 2560×1440 | AVIF/WebP | 3 модели, Алматы, крупные принты |
| 2 | Hero tablet | `hero-home-tablet-v01` | 2048×1536 | AVIF/WebP | Адаптированный crop |
| 3 | Hero mobile | `hero-home-mobile-v01` | 1536×1920 | AVIF/WebP | Отдельная вертикальная композиция |
| 4 | Основа oversize | `base-oversize-black-front` | 1600×1200 | AVIF/WebP | Blank black oversize |
| 5 | Основа classic | `base-classic-bone-front` | 1600×1200 | AVIF/WebP | Blank light classic |
| 6 | Основа sweatshirt | `base-sweatshirt-black-front` | 1600×1200 | AVIF/WebP | Blank black sweatshirt |
| 7 | Основа cap | `base-cap-black-three-quarter` | 1600×1200 | AVIF/WebP | Black cap 3/4 |
| 8 | Constructor garment | `constructor-oversize-black-front-transparent` | 1800×1800 | WebP/PNG | Blank transparent mockup |
| 9 | Constructor print | `print-alma-city-of-mountains-v01` | Vector | SVG | ALMA typographic print |
| 10–15 | Print ideas | `idea-*` | 1200×900 | AVIF | 6 editorial themes |
| 16–19 | Quality | `quality-*` | 1400×900 | AVIF | 4 macro details |
| 20 | Teams | `teams-crew-almaty-back-v01` | 2000×1500 | AVIF/WebP | 2 people, back prints |

## 19.1. Product page package

Для каждой модели товара отдельно:

1. `front-isolated`;
2. `back-isolated`;
3. `onbody-front`;
4. `onbody-back`;
5. `onbody-side`;
6. `fabric-macro`;
7. `seam-collar-detail`;
8. `printed-example`.

Минимум:

- isolated: 1800×1800;
- on-body: 1600×2000;
- macro: 1600×1200.

## 19.2. Правила правдивости

- AI campaign нельзя подписывать «реальные клиенты».
- До появления реального UGC название секции: `INKMADE LOOKBOOK`.
- Реальный UGC хранить отдельно.
- У каждого AI-кадра вручную проверять лица, пальцы, швы и typography.
- Финальные принты лучше накладывать после генерации изображения, а не доверять генератору надписи.

---

# 20. Responsive

## Tablet 768–1023

- 8-column grid;
- hero 420–470 px;
- H1 50–62 px;
- products: horizontal carousel или 2×2;
- constructor intro сверху;
- canvas 5 columns, controls 3 columns;
- toolbar horizontal;
- B2B image can move below benefits.

## Mobile ≤ 767

- 4-column grid;
- H1 42–54 px;
- no desktop mini-columns;
- CTA full width where critical;
- touch target minimum 44 px;
- horizontal scrolling only for product and idea cards;
- no tiny sidebar;
- constructor controls via bottom sheet;
- no parallax;
- separate photo crops.

---

# 21. Animation

Allowed:

- opacity + translateY 12–18 px;
- duration 420–600 ms;
- stagger 60–80 ms;
- CTA arrow translateX 4 px;
- product scale 1.02;
- crossfade price;
- swatch transition;
- constructor layer transform.

Not allowed:

- long entrance sequence before user sees CTA;
- full-screen loaders;
- smooth-scroll library across entire site;
- automatic horizontal motion;
- mobile parallax;
- cursor replacement that harms usability.

Easing:

```ts
export const easeOutPremium = [0.22, 1, 0.36, 1] as const
export const easeInOutPremium = [0.65, 0, 0.35, 1] as const
```

Reduced motion is mandatory.

---

# 22. Проверенный набор библиотек

## 22.1. Nuxt

Для уже существующего Nuxt 4-проекта не выполнять `pnpm add nuxt vue` без необходимости.

Проверка/обновление:

```bash
pnpm nuxt upgrade
```

При миграции:

```bash
pnpm add nuxt@^4
```

## 22.2. Tailwind CSS 4

```bash
pnpm add tailwindcss @tailwindcss/vite
```

`nuxt.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  css: [
    '~/assets/css/main.css'
  ]
})
```

## 22.3. Nuxt modules

Предпочтительный способ:

```bash
npx nuxi@latest module add supabase
npx nuxi@latest module add pinia
npx nuxi@latest module add image
npx nuxi@latest module add icon
npx nuxi@latest module add fonts
npx nuxi@latest module add eslint
```

Modules:

- `@nuxtjs/supabase`;
- `@pinia/nuxt`;
- `@nuxt/image`;
- `@nuxt/icon`;
- `@nuxt/fonts`;
- `@nuxt/eslint`.

## 22.4. Runtime dependencies

```bash
pnpm add motion-v zod vee-validate @vee-validate/zod
```

## 22.5. Constructor

Выбранный production-вариант:

```bash
pnpm add konva vue-konva
```

Подключать client-only.

`app/plugins/vue-konva.client.ts`:

```ts
import VueKonva from 'vue-konva'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueKonva)
})
```

Компонент:

```vue
<ClientOnly>
  <ConstructorCanvas />
  <template #fallback>
    <div class="constructor-canvas-skeleton" aria-hidden="true" />
  </template>
</ClientOnly>
```

Не хранить состояние только в Konva JSON. Источник правды — типизированный Vue/Pinia state. Konva рисует состояние.

## 22.6. Carousel

Главная:

- native CSS scroll snap.

Swiper не устанавливать, пока не нужны loop/virtual/synchronized sliders.

## 22.7. Testing

```bash
pnpm add -D @nuxt/test-utils vitest @vue/test-utils happy-dom @playwright/test
```

Обязательно:

- unit tests pricing;
- unit tests print quality calculation;
- E2E constructor flow;
- checkout E2E;
- visual regression screenshots.

Playwright viewports:

- 390×844;
- 768×1024;
- 1440×900;
- 1920×1080.

---

# 23. Nuxt 4 structure

```text
app/
  app.vue
  assets/
    css/
      main.css
      typography.css
  components/
    brand/
    layout/
    home/
    commerce/
    constructor/
    ui/
  composables/
    useProducts.ts
    useConstructor.ts
    useImageQuality.ts
    useBreakpoints.ts
  layouts/
    default.vue
    constructor.vue
  pages/
    index.vue
    catalog/
      index.vue
      [slug].vue
    customize/
      [slug].vue
    business.vue
    cart.vue
    checkout.vue
  plugins/
    vue-konva.client.ts
  stores/
    cart.ts
    constructor.ts
    user.ts

shared/
  types/
    database.types.ts
    product.ts
    design.ts
    order.ts
  utils/
    currency.ts
    printMath.ts
    printZones.ts

server/
  api/
    catalog/
    checkout/
    orders/
    payments/
  utils/
    supabaseServiceRole.ts
    pricing.ts

public/
  brand/
  icons/
```

Правило:

- `app/` — Vue UI и client-facing код;
- `shared/` — чистые типы и функции, которые использует client и server;
- `server/` — Nitro handlers и секретная логика;
- service role никогда не импортируется в `app/` или `shared/`.

---

# 24. Supabase architecture

## 24.1. Обязательные правила

1. На всех пользовательских таблицах включить RLS.
2. Пользователь видит и редактирует только свои drafts/designs/orders.
3. Публичный каталог читается через безопасную public policy.
4. Цена заказа рассчитывается на сервере.
5. Клиентская цена — preview, не источник истины.
6. Service-role key находится только в server runtime config.
7. Платёжный webhook проверяется сервером.
8. Authenticated routes не кэшировать через ISR.
9. User uploads хранить в private bucket до проверки.
10. SVG/PDF sanitization обязательна.

## 24.2. Основные таблицы

Минимально:

- `products`;
- `product_variants`;
- `product_media`;
- `print_zones`;
- `designs`;
- `design_layers`;
- `orders`;
- `order_items`;
- `business_leads`.

## 24.3. Важные типы

Цена:

- integer в тиынах/минимальных единицах либо integer KZT при отсутствии дробной валюты;
- единый подход во всей системе;
- никакого float.

Order item содержит snapshot:

- product name;
- SKU;
- size;
- color;
- base price;
- print price;
- quantity;
- design preview;
- editor JSON version.

## 24.4. Type generation

После изменения schema генерировать TypeScript database types и хранить в:

`shared/types/database.types.ts`.

---

# 25. Print zones

Следующие числа — стартовые рекомендации для UI. Производство обязано подтвердить их по каждой основе.

| Изделие | Зона | Max W | Max H | Recommended W |
|---|---|---:|---:|---:|
| Oversize tee | Front center | 340 mm | 420 mm | 280–320 mm |
| Oversize tee | Back large | 360 mm | 460 mm | 300–340 mm |
| Classic tee | Front center | 300 mm | 380 mm | 240–280 mm |
| Sweatshirt | Front center | 320 mm | 380 mm | 250–290 mm |
| Hoodie | Back large | 350 mm | 440 mm | 290–330 mm |
| Cap | Front | 120 mm | 55 mm | 90–110 mm |
| Tote | Front | 280 mm | 320 mm | 220–260 mm |

Quality:

- warning below 150 effective PPI;
- acceptable 150–220;
- preferred 220–300;
- PPI рассчитывается после определения физического размера принта.

---

# 26. Nuxt config baseline

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/eslint'
  ],

  css: [
    '~/assets/css/main.css',
    '~/assets/css/typography.css'
  ],

  vite: {
    plugins: [
      tailwindcss()
    ]
  },

  image: {
    format: ['avif', 'webp'],
    quality: 82
  },

  runtimeConfig: {
    supabaseServiceRoleKey: '',
    paymentSecret: '',
    public: {
      siteUrl: '',
      paymentPublicKey: ''
    }
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      }
    }
  }
})
```

Не включать глобальный ISR для authenticated pages.

---

# 27. Images implementation

## Hero

Использовать `<picture>` или responsive `NuxtPicture`.

Hero desktop и mobile — разные assets. Не полагаться только на `object-position`.

## Product images

- задавать `width` и `height`;
- lazy-load below fold;
- above fold base cards можно загрузить eager только в разумном количестве;
- не прогонять внешние SVG mockups через IPX, если provider их не поддерживает;
- SVG icon/brand assets загружать напрямую.

## Storage

Buckets:

- `catalog-public`;
- `lookbook-public`;
- `design-uploads-private`;
- `design-previews-private-or-signed`;
- `order-production-private`.

---

# 28. Accessibility

- один H1;
- semantic landmarks;
- keyboard navigation;
- focus visible;
- no color-only selection;
- swatch has color name;
- 44×44 touch targets;
- body contrast AA;
- constructor has form controls mirroring canvas transforms;
- reduced motion;
- alt describes garment and view, not decorative marketing text.

---

# 29. Performance

Targets:

- LCP ≤ 2.5 s;
- CLS ≤ 0.1;
- INP ≤ 200 ms;
- Lighthouse Performance ≥ 85;
- Accessibility ≥ 90.

Rules:

- hero preload only current breakpoint asset;
- editor dynamic/client-only;
- no constructor bundle on home until needed;
- font subset Cyrillic/Latin/Kazakh;
- no autoplay large video mobile;
- avoid unnecessary Realtime subscription;
- cleanup Supabase channels.

---

# 30. Visual regression

Без этого невозможно подтвердить «точно как в макете».

Каждый ключевой блок получает screenshot test.

Example:

```ts
import { test, expect } from '@playwright/test'

test('home desktop visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot('home-1440.png', {
    fullPage: true,
    animations: 'disabled'
  })
})
```

Допустимый diff задаётся только после согласования baseline.

---

# 31. Acceptance checklist

## Visual

- [ ] Hero 460–520 px на desktop, а не растянут на весь экран.
- [ ] Бордовый занимает не более 8–12% экрана.
- [ ] Светлые блоки Bone, не pure white.
- [ ] Карточки основы Warm Card.
- [ ] Header 64 px.
- [ ] Все секции сохраняют компактный rhythm.
- [ ] Desktop и mobile hero используют отдельные фото.
- [ ] Принты остаются главным visual object.
- [ ] Нет AI-ошибок в typography и людях.

## Functional

- [ ] Нет цены `0 ₸`.
- [ ] Каталог и карточки загружаются без broken SVG.
- [ ] Constructor client-only.
- [ ] Price recalculated server-side.
- [ ] RLS enabled.
- [ ] Service role server-only.
- [ ] Payment webhook verified.
- [ ] Draft autosave works.
- [ ] Low-resolution warning uses effective PPI.

## Responsive

- [ ] 390 px.
- [ ] 768 px.
- [ ] 1440 px.
- [ ] 1920 px.
- [ ] No horizontal page overflow.
- [ ] Carousels use scroll snap.
- [ ] Touch targets ≥ 44 px.

---

# 32. Development order

## Phase 1 — Foundation

1. Tokens.
2. Fonts.
3. Grid.
4. Header/footer.
5. Buttons/cards.
6. `/ui-kit`.
7. Playwright baseline.

## Phase 2 — Homepage static

1. Top bar.
2. Hero.
3. Trust strip.
4. Product bases.
5. Constructor preview.
6. Ideas.
7. Process.
8. Quality.
9. Teams.

## Phase 3 — Content assets

1. Hero 3 crops.
2. 4 isolated bases.
3. Constructor mockup.
4. ALMA vector print.
5. 6 idea images.
6. 4 macro quality images.
7. B2B image.

## Phase 4 — Supabase

1. Schema.
2. RLS.
3. Types.
4. Catalog.
5. Storage.
6. Draft designs.

## Phase 5 — Constructor

1. Konva client-only.
2. Upload.
3. Text.
4. Layers.
5. Transform.
6. Safe zones.
7. Effective PPI.
8. Preview.
9. Server price.

## Phase 6 — Commerce

1. Cart.
2. Checkout.
3. Payment.
4. Webhook.
5. Order snapshot.
6. Status.
7. Production assets.

---

# 33. Финальное правило

Любой элемент должен проходить хотя бы один тест:

- усиливает желание носить вещь;
- помогает создать дизайн;
- доказывает качество;
- помогает оформить заказ.

Если блок только объясняет то, что можно показать одной сильной фотографией, текст нужно сокращать.

Если решение делает сайт похожим на обычную типографию, маркетплейс или шаблон SaaS, решение не подходит INKMADE.

---

# 34. Технические источники проверки

- [Nuxt 4 directory structure](https://nuxt.com/docs/4.x/directory-structure)
- [Nuxt 4 testing](https://nuxt.com/docs/4.x/getting-started/testing)
- [Tailwind CSS 4 with Nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt)
- [Nuxt Supabase module](https://nuxt.com/modules/supabase)
- [Supabase Nuxt SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Pinia with Nuxt](https://pinia.vuejs.org/ssr/nuxt.html)
- [Nuxt Image](https://image.nuxt.com/get-started/installation)
- [Nuxt Fonts](https://fonts.nuxt.com/get-started/installation)
- [Motion for Vue](https://motion.dev/docs/vue)
- [Vue Konva](https://konvajs.org/docs/vue/index.html)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

---

# 35. Что означает «сильный» и что означает «прорывной» сайт

Важно разделять три уровня результата.

## 35.1. Уровень 1 — профессиональный premium-commerce

На этом уровне сайт:

- визуально дорогой;
- быстро работает;
- имеет цельную дизайн-систему;
- хорошо показывает одежду;
- понятно ведёт к заказу;
- не похож на типографию;
- корректно работает на mobile;
- выдерживает визуальный контроль на всех брейкпоинтах.

Текущая спецификация уже покрывает этот уровень.

## 35.2. Уровень 2 — лучший fashion-merch сервис в регионе

Для этого недостаточно красивого dark UI. Нужны:

- сильный конструктор;
- curated-принты;
- авторские коллекции;
- premium-базы;
- понятная посадка;
- быстрое оформление;
- сохранение дизайнов;
- полноценный B2B storefront;
- настоящий fashion-content;
- единый стиль всех точек контакта.

## 35.3. Уровень 3 — прорыв

Прорывной сайт нельзя построить только из:

- чёрного фона;
- бордового CTA;
- большого шрифта;
- бетонных фотографий;
- красивых карточек.

Прорыв возникает, когда пользователь может описать INKMADE одной уникальной фразой:

> **Это казахстанский fashion-tech бренд, где можно выбрать сильную основу, взять авторский принт или создать свой — и вещь всё равно выглядит как настоящая мода, а не как продукция из принт-центра.**

Критерии прорыва:

1. У INKMADE есть собственный графический язык.
2. У бренда есть собственные Editions.
3. Конструктор ощущается как co-creation, а не как Photoshop.
4. Product experience по качеству сравним с сильными fashion-магазинами.
5. B2B-магазины визуально выглядят как самостоятельные бренды.
6. Сайт, упаковка, соцсети и будущий офлайн-магазин говорят на одном языке.
7. Даже без логотипа часть интерфейса и визуала можно узнать как INKMADE.

---

# 36. Фирменный графический язык — INK SYSTEM

## 36.1. Назначение

INK SYSTEM — это собственный визуальный код INKMADE.

Он нужен, чтобы сайт не воспринимался как ещё один dark streetwear-магазин.

Система должна использоваться:

- на сайте;
- в конструкторе;
- в принтах;
- на hangtags;
- на упаковке;
- в социальных сетях;
- в рекламных видео;
- в digital signage будущего магазина;
- в B2B-витринах;
- в печатных материалах.

## 36.2. Элементы системы

### Print zone frame

Тонкая техническая рамка, обозначающая зону нанесения.

Параметры:

- stroke: 1 px;
- цвет на тёмном: `rgba(243,240,235,.55)`;
- цвет на светлом: `rgba(8,11,13,.40)`;
- selected state: Burgundy;
- углы прямые или с минимальным radius 1 px;
- допускаются crop marks длиной 8–12 px.

### Registration marks

Маленькие печатные метки:

- крест;
- угловые метки;
- точка центра;
- размерные риски;
- координатная сетка.

Использовать дозированно. Они должны выглядеть как часть настоящего production workflow, а не как декоративный cyberpunk.

### Design ID

Формат:

```text
INK-ALM-001
INK-ALM-002
INK-KZ-001
```

Применение:

- карточка принта;
- label коллекции;
- product page;
- hangtag;
- упаковка;
- footer print detail;
- preview конструктора.

Style:

- 10–11 px;
- uppercase;
- tracking `.08em`;
- Text Muted или Burgundy;
- шрифт UI, не display.

### Placement labels

Форматы:

```text
FRONT
BACK
SLEEVE
CHEST
CENTER
```

Применение:

- конструктор;
- product preview;
- технические карточки;
- animation states.

### Physical dimensions

Пример:

```text
PRINT AREA 310 × 380 MM
```

Это не должно доминировать в retail-интерфейсе. Показывать:

- в constructor advanced mode;
- в product technical details;
- на production-ready preview;
- в B2B project view.

### Coordinates

Базовый мотив:

```text
43.2389° N
76.8897° E
ALMATY, KAZAKHSTAN
```

Применение:

- footer;
- hero micro label;
- packaging;
- campaign detail;
- B2B storefront;
- print labels.

Не использовать координаты в каждой секции.

### MADE IN ALMATY stamp

Формат:

```text
MADE IN ALMATY
DESIGNED WITH INKMADE
```

Использовать как:

- stamp;
- label;
- print footer;
- hangtag;
- order card;
- product detail.

### Edition number

Формат:

```text
EDITION 001
DROP 01
ARCHIVE 01
```

Применение:

- curated collections;
- print cards;
- lookbook;
- social campaign;
- physical labels.

## 36.3. Ограничения

INK SYSTEM не должен превращаться в визуальный шум.

На одном viewport:

- не более 2 крупных технических рамок;
- не более 3 микро-label;
- не более 1 набора координат;
- не более 1 крупного Design ID;
- technical text не должен конкурировать с H1.

---

# 37. Система авторских коллекций — INKMADE EDITIONS

## 37.1. Почему это необходимо

Категории вроде:

- типографика;
- культура;
- минимализм;
- абстракция;

полезны как фильтры, но не создают бренд и желание коллекционировать.

INKMADE должен продавать не только отдельные принты, а связанные визуальные истории.

## 37.2. Структура Edition

Каждая Edition включает:

- название;
- номер;
- визуальную идею;
- короткую историю;
- 4–8 принтов;
- 2–4 рекомендуемые основы;
- hero-картинку;
- close-up;
- on-body;
- карточку «создать свою версию»;
- автора или creative direction;
- дату выхода;
- ограниченный или постоянный статус.

## 37.3. Примеры

### EDITION 001 — CITY OF MOUNTAINS

Тема:

- Алматы;
- горы;
- бетон;
- ночной город;
- координаты;
- vertical typography;
- washed grey + Bone + Burgundy.

### EDITION 002 — STEPPE SIGNAL

Тема:

- ритм степи;
- сигналы;
- линии;
- современные символы;
- графика без сувенирной этники.

### EDITION 003 — AFTER DARK

Тема:

- ночной Алматы;
- вспышка;
- зерно;
- типографика;
- отражения;
- городской шум.

### EDITION 004 — PERSONAL ARCHIVE

Тема:

- личные фотографии;
- даты;
- имена;
- семейные изображения;
- современный архивный дизайн.

## 37.4. UX блока на главной

Название блока:

```text
INKMADE EDITIONS
```

Карточка показывает:

- `EDITION 001`;
- название;
- 1 hero-image;
- 2–3 preview thumbnails;
- CTA `СМОТРЕТЬ EDITION`;
- вторичный CTA `СОЗДАТЬ СВОЮ ВЕРСИЮ`.

На первом этапе можно оставить компактный блок «Идеи для принта», но data model и визуальная архитектура должны быть готовы к переходу на Editions.

---

# 38. Мир бренда — Brand World

## 38.1. Долгосрочная структура

INKMADE должен развиваться не только как каталог.

Нужные разделы:

- `LOOKBOOK`;
- `EDITIONS`;
- `CREATORS`;
- `ALMATY STORIES`;
- `BEHIND THE PRINT`;
- `INKMADE COMMUNITY`;
- `ARCHIVE`.

## 38.2. Этап запуска

Не создавать пустые разделы.

Порядок:

1. LOOKBOOK.
2. EDITIONS.
3. BEHIND THE PRINT.
4. CREATORS.
5. COMMUNITY.
6. ARCHIVE.

## 38.3. Офлайн-продолжение

Будущий магазин должен использовать тот же язык:

- Ink Black;
- Bone;
- Burgundy;
- технические print-zone рамки;
- Design ID;
- Edition numbering;
- координаты Алматы;
- экран PRINT REVEAL;
- modular display;
- вещи как gallery objects;
- constructor station;
- sample wall;
- print archive.

Сайт не проектируется отдельно от будущего физического пространства.

---

# 39. Пересмотр блока «Выбери основу»

## 39.1. Риск текущей версии

Если показывать только blank-изделия, пользователь снова воспринимает INKMADE как сервис печати на заготовках.

## 39.2. Новое правило карточки основы

Каждая карточка имеет два состояния.

### Default

- clean isolated base;
- название;
- fit;
- плотность;
- цена;
- цвет.

### Hover desktop / swipe mobile

- та же основа на человеке;
- стильный готовый принт;
- подпись `SEE IT WORN`;
- краткая fit-подсказка.

Пример:

```text
OVERSIZE 240
Heavy cotton · dropped shoulder
От 8 990 ₸
```

## 39.3. Изображения

На каждую основу дополнительно требуется:

- `base-*-onbody-printed.avif`;
- одинаковый человек или единый campaign style;
- видимый силуэт;
- готовый print не перекрывает fit.

## 39.4. Desktop interaction

- media crossfade: 220–300 ms;
- product image scale: 1.02;
- printed on-body appears after 80–120 ms delay;
- CTA remains stable;
- no layout shift.

## 39.5. Mobile interaction

Карточка может иметь:

- 2 dots;
- horizontal mini-swipe;
- first frame blank;
- second frame worn.

Не использовать hover-dependent информацию как единственный способ увидеть второе состояние.

---

# 40. Пересмотр preview конструктора

## 40.1. Главный принцип

Preview на главной должен показывать **магию создания**, а не весь профессиональный редактор.

## 40.2. Что оставить на главной

Действия:

1. Добавить принт.
2. Добавить текст.
3. Выбрать дизайн.
4. Переключить front/back.
5. Изменить размер принта.
6. Увидеть цену.

## 40.3. Что убрать с preview главной

Не показывать постоянно:

- layer panel;
- PPI;
- duplicate;
- precise alignment;
- rotation degrees;
- production dimensions;
- multi-object inspector;
- advanced export;
- full history.

Эти инструменты остаются в полноценном constructor route.

## 40.4. Визуальная композиция

На главной:

- футболка занимает не менее 60% canvas;
- controls остаются крупными;
- не более 3 controls одновременно;
- H2 и garment должны считываться быстрее panel;
- цена видна сразу;
- CTA один главный.

## 40.5. Full constructor

Полный редактор может иметь режимы:

- `SIMPLE`;
- `ADVANCED`.

Simple:

- upload;
- text;
- templates;
- front/back;
- scale;
- price.

Advanced:

- layers;
- dimensions;
- effective PPI;
- alignment;
- rotation;
- print zone;
- precise positioning.

---

# 41. Фирменный интерактивный эффект — PRINT REVEAL

## 41.1. Назначение

PRINT REVEAL должен стать узнаваемым движением INKMADE.

Не использовать сложный 3D или длинный intro.

## 41.2. Сценарий

1. Появляется blank garment.
2. На ткани проявляется print-zone frame.
3. Появляются registration marks.
4. На 600–800 ms проявляется print.
5. Frame и marks уменьшают opacity.
6. Остаётся готовая вещь.
7. Появляется CTA `СОЗДАТЬ СВОЮ`.

## 41.3. Timing

```text
0–160 ms     garment fade
160–360 ms   print frame draw
320–520 ms   registration marks
420–980 ms   print reveal
820–1100 ms  frame fade
900–1200 ms  CTA reveal
```

Общая длительность:

- максимум 1.2 s;
- пользователь не должен ждать окончания для interaction.

## 41.4. Где использовать

- hero desktop;
- constructor preview;
- смена print template;
- hover selected product;
- social videos;
- in-store digital screen;
- B2B storefront launch.

## 41.5. Реализация

Предпочтительно:

- CSS mask;
- clip-path;
- opacity;
- SVG stroke animation;
- Motion for Vue.

Не использовать video, если эффект можно реализовать DOM/SVG.

Reduced motion:

- сразу показывать final garment;
- без frame animation.

---

# 42. Усиление product page

## 42.1. Обязательная информация о посадке

Каждая product page должна содержать:

- рост модели;
- размер на модели;
- обхват груди модели;
- fit label;
- рекомендацию размера;
- точные замеры изделия;
- сравнение Classic/Oversize;
- уход;
- плотность;
- состав;
- shrinkage note, если применимо.

Пример:

```text
Модель: 182 см
На модели: L
Посадка: свободная oversize
Для более собранной посадки выберите на размер меньше.
```

## 42.2. Size comparison

Отдельный визуальный блок:

- Classic;
- Relaxed;
- Oversize.

Показывает:

- ширину;
- длину;
- плечо;
- рукав;
- общий силуэт.

## 42.3. On-body diversity

По мере роста контента:

- разные ростовые группы;
- разные телосложения;
- мужские и женские образы;
- same garment / different size.

## 42.4. Print preview

Пользователь должен видеть:

- изделие без принта;
- готовый fashion-look;
- свой design preview;
- front/back.

## 42.5. Product storytelling

Кроме технических характеристик:

- короткий текст о силуэте;
- почему эта основа выбрана INKMADE;
- для каких принтов подходит;
- как сочетается.

---

# 43. B2B как fashion-product

## 43.1. Главное отличие

INKMADE B2B не продаёт стандартный корпоративный мерч.

Позиционирование:

> **Мерч, который выглядит как полноценная коллекция бренда и который сотрудники, студенты, спортсмены и участники сообщества хотят носить вне мероприятий.**

## 43.2. B2B storefront

Каждый storefront должен иметь:

- собственный hero;
- logo/identity;
- коллекции;
- product cards;
- lookbook;
- brand story;
- custom domain/subdomain;
- mobile-first checkout;
- analytics;
- revenue share;
- brand-specific palette within INKMADE system.

## 43.3. Quality gate

Нельзя публиковать B2B storefront, если:

- фотографии выглядят как мокапы рекламного агентства;
- используются дешёвые blank-базы;
- принты выглядят как логотип по центру;
- нет визуального единства коллекции;
- storefront выглядит слабее главного INKMADE.

## 43.4. Standard merch

Стандартные корпоративные заказы остаются частью бизнеса, но визуально не должны определять основной бренд.

Разделение:

- `INKMADE STUDIO` — fashion-merch и storefronts;
- `CORPORATE` — стандартные тиражи и нанесение.

В интерфейсе главный акцент — STUDIO.

---

# 44. Контент как критическая часть продукта

## 44.1. Правило

Слабые фотографии разрушат даже идеальный UI.

Успех проекта зависит от:

- арт-дирекции;
- моделей;
- styling;
- света;
- реальной одежды;
- качества принтов;
- цветокоррекции;
- правильных crops.

## 44.2. Контентный minimum viable launch

До запуска рекламы подготовить:

- 3 hero crops;
- 4 blank bases;
- 4 on-body printed states;
- 1 constructor garment;
- 1 hero print;
- 6 idea/editorial images;
- 4 quality macro images;
- 1 B2B lifestyle image;
- product page package хотя бы для hero-product;
- 1 короткий PRINT REVEAL asset/demo.

## 44.3. Hero-product

Главный товар запуска:

```text
INKMADE OVERSIZE 240
```

Он должен получить лучший контент:

- front/back blank;
- front/back on-body;
- 3 styled looks;
- fabric macro;
- seam/collar;
- 3 print examples;
- size comparison;
- short lookbook sequence.

---

# 45. Размеры секций — визуальные цели, а не жёсткие height

## 45.1. Запрещено

```css
.section {
  height: 300px;
}
```

для контентных секций.

## 45.2. Правильно

```css
.section {
  min-height: 280px;
  padding-block: 36px;
}
```

Финальная высота определяется:

- контентом;
- сеткой;
- размером изображения;
- брейкпоинтом;
- визуальным regression baseline.

## 45.3. Исключения

Жёсткая/контролируемая высота допустима:

- hero artboard;
- media card;
- constructor canvas;
- top bar;
- header;
- carousel viewport.

---

# 46. Оценка качества перед релизом

## 46.1. Дизайн не считается прорывным, если

- он выглядит красиво только на hero;
- product page остаётся обычной;
- mobile выглядит упрощённо и бедно;
- constructor перегружен;
- blank-базы выглядят дешёво;
- print ideas — generic;
- B2B выглядит как рекламная продукция;
- нет собственного движения и graphic language.

## 46.2. Признаки сильного результата

- посетитель сразу понимает, что это fashion;
- первый экран хочется сохранить или отправить;
- товар хочется носить ещё до кастомизации;
- constructor вызывает желание попробовать;
- Editions выглядят как настоящие drops;
- B2B хочется показать руководителю/команде;
- mobile не уступает desktop;
- каждая фотография выглядит частью одной кампании.

## 46.3. Признаки прорыва

- интерфейс узнаётся без логотипа;
- PRINT REVEAL становится фирменным;
- Design ID и print frames становятся частью бренда;
- люди используют готовые Editions и создают свои версии;
- пользователи публикуют вещи не как «заказал печать», а как fashion purchase;
- офлайн-магазин логично продолжает digital experience.

---

# 47. Дополнительные acceptance criteria

## Brand system

- [ ] INK SYSTEM реализован в hero, constructor и Editions.
- [ ] Technical labels не перегружают UI.
- [ ] Design ID имеет единый формат.
- [ ] Coordinates используются дозированно.
- [ ] MADE IN ALMATY stamp подготовлен как компонент.

## Product cards

- [ ] Blank state.
- [ ] On-body printed state.
- [ ] Desktop hover.
- [ ] Mobile swipe.
- [ ] No layout shift.

## Constructor

- [ ] Homepage preview remains simple.
- [ ] Full editor has Simple/Advanced separation.
- [ ] PRINT REVEAL implemented.
- [ ] Reduced motion fallback.

## Editions

- [ ] Data model supports Editions.
- [ ] At least one launch Edition exists.
- [ ] Edition has story, print set and product recommendations.
- [ ] User can start from an Edition and customize it.

## Product page

- [ ] Model height and worn size.
- [ ] Exact measurements.
- [ ] Fit recommendation.
- [ ] Classic/Oversize comparison.
- [ ] On-body and macro images.
- [ ] Print preview.

## B2B

- [ ] Storefront is visually equal to main brand.
- [ ] Fashion-merch and standard corporate merch are separated in positioning.
- [ ] At least one full demo storefront exists.
- [ ] Economics and process are transparent.

---

# 48. Обновлённый стратегический порядок разработки

## Phase 0 — Brand differentiation

До production UI:

1. Зафиксировать INK SYSTEM.
2. Нарисовать registration marks.
3. Создать Design ID system.
4. Создать MADE IN ALMATY stamp.
5. Создать PRINT REVEAL prototype.
6. Утвердить EDITION 001.
7. Утвердить hero-product OVERSIZE 240.

## Phase 1 — Foundation

1. Tokens.
2. Typography.
3. Grid.
4. UI kit.
5. Motion tokens.
6. INK SYSTEM components.
7. Visual regression.

## Phase 2 — Content production

1. Hero.
2. Product blanks.
3. On-body printed states.
4. Constructor assets.
5. Edition 001.
6. Quality macros.
7. B2B campaign.

## Phase 3 — Homepage

1. Top bar.
2. Header.
3. Hero + PRINT REVEAL.
4. Product cards with dual state.
5. Simplified constructor preview.
6. Editions preview.
7. Process.
8. Quality.
9. B2B teaser.
10. Footer.

## Phase 4 — Product experience

1. Catalog.
2. Product page.
3. Fit comparison.
4. Size guidance.
5. Rich gallery.
6. Printed examples.

## Phase 5 — Constructor

1. Simple mode.
2. Advanced mode.
3. Pricing.
4. Save drafts.
5. Effective PPI.
6. Server validation.
7. Export production assets.

## Phase 6 — B2B platform

1. Demo storefront.
2. Partner onboarding.
3. Product collection.
4. Revenue logic.
5. Analytics.
6. Storefront theming.

## Phase 7 — Brand world

1. Lookbook.
2. Editions.
3. Behind the Print.
4. Creators.
5. Community.
6. Archive.

---

# 49. Финальный стратегический вывод

Текущая спецификация создаёт сильный профессиональный сайт.

Но цель INKMADE — не просто сделать сайт визуально дороже конкурентов.

Цель:

> **создать узнаваемую fashion-систему, которая начинается на экране, продолжается на ткани, упаковке и в социальных сетях, а затем естественно переходит в физический магазин.**

Технический dark-editorial UI является основой.

Прорыв создают:

- INK SYSTEM;
- Editions;
- PRINT REVEAL;
- premium bases;
- product storytelling;
- сильный mobile constructor;
- fashion-level B2B storefronts;
- единый brand world.

Именно эти элементы должны считаться обязательной частью долгосрочного продукта, а не необязательным декоративным улучшением.

