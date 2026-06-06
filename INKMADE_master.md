# INKMADE — Мастер-документ проекта

**Merch Studio · EST. 2025**
Единый источник правды для разработки. Объединяет бизнес-стратегию, дизайн-систему, архитектуру, полную схему БД, функциональность, процессы и дорожную карту. Подготовлен для следующего сеанса разработки.

Любое решение, не зафиксированное здесь, считается неутверждённым. Все числовые значения размеров/зон/цен — референсные стартовые из индустриальных стандартов; финальные берутся из спецификаций поставщика заготовок и заносятся в БД, структура от этого не меняется.

---

## Оглавление

**ЧАСТЬ A — БИЗНЕС И СТРАТЕГИЯ**
1. Суть продукта
2. Конкуренты и позиционирование
3. Налоговая стратегия (KZ)
4. B2B-направление (фаза 2)
5. Стратегия продвижения

**ЧАСТЬ B — ДИЗАЙН-СИСТЕМА**
6. Фирменный стиль (цвета, шрифты, токены)

**ЧАСТЬ C — АРХИТЕКТУРА**
7. Технологический стек
8. Структура проекта
9. Окружение и секреты

**ЧАСТЬ D — БАЗА ДАННЫХ**
10. Принцип масштаба принта
11. Каталог (товары, размеры, варианты, мокапы)
12. Методы нанесения и матрица ограничений
13. Дизайн пользователя и артефакты
14. Ценообразование
15. Заказы и производство
16. Пользователи, доставка, B2B
17. Юридический и операционный слой (фискализация, согласия, модерация, возвраты, уведомления)
18. Карта таблиц (полная)

**ЧАСТЬ E — ФУНКЦИОНАЛЬНОСТЬ**
19. Кастомайзер
20. Лендинг
21. Роли и кабинеты (клиент / производство / админ)
22. Бизнес-процессы
23. Поток «оплата → производство → доставка»

**ЧАСТЬ F — ЗАПУСК**
24. Инварианты (что нельзя упрощать)
25. Дорожная карта функций
26. Порядок сборки
27. Расширенный функционал (бэклог)
28. Открытые вопросы и сводка

---

# ЧАСТЬ A — БИЗНЕС И СТРАТЕГИЯ

## 1. Суть продукта

**Одной фразой.** B2C-платформа: пользователь выбирает изделие, наносит принт прямо в браузере (свой файл или из библиотеки), задаёт зону/размер/положение, видит реалистичное превью и цену сразу, оплачивает онлайн, получает готовую вещь с доставкой. Тираж — от одной штуки.

**Модель производства.** Собственное. Методы на старте: DTG (цифровая по хлопку), DTF (термоперенос), сублимация (full-print по синтетике). Шелкография и вышивка — после MVP. Не-текстиль (ручки/кружки/наборы) — под B2B. POD-партнёры (Printful/Gelato) НЕ используются. Внутри платформы есть производственный контур: очередь заказов, спецификация нанесения, дашборд цеха, учёт заготовок.

**Рынок.** Казахстан (Алматы и далее). Интерфейс на русском, задел на казахский. Платежи и логистика — под KZ.

**Позиционирование.** Узкий стрит-бренд с граффити-айдентикой (логотип INKMADE). Это противоположность безликому масс-маркету. Узость — преимущество, не ограничение.

## 2. Конкуренты и позиционирование

**merchstudio.ru** — визуальный и структурный референс лендинга, но это B2B (опт от 50, заявки, менеджеры). Берём визуальный язык и структуру, НЕ бизнес-логику.

| Параметр | B2B-референс | INKMADE (B2C) |
|---|---|---|
| Тираж | от 50 шт | от 1 шт |
| Цена | «оставьте заявку» | мгновенный калькулятор |
| Процесс | менеджер | самообслуживание |
| Клиент | компания | частное лицо |
| Оплата | договор, безнал | карта/Kaspi сразу |

Запрещено переносить: форму «оставьте заявку», минимальный тираж, B2B-риторику (для B2C-потока).

**vsemayki.ru** — зрелый POD-гигант РФ (с 2007), доказательство что модель работает в масштабе. Чек-лист техрешений, не образец позиционирования.

Перенято: жёсткая связь материал → метод → зоны; DPI-валидация от макс. размера изделия; каталог готовых дизайнов как отдельный канал; URL-схема конструктора по alias; полноценный текстовый инструмент; подсказки по зонам.

Не берём: открытый маркетплейс самозалива (роялти 3%/15₽, модерация 10–15 дней, поток мусора, риск копирайта) — вместо него курируемый каталог; ширину 200+ товаров; визуальную безликость.

Стратегический вывод: выигрываем там, где гигант слаб — бренд, эстетика, качество печати.

## 3. Налоговая стратегия (KZ)

> Не юридическая консультация. Финальную конфигурацию утверждать с бухгалтером в Алматы и сверять с КГД — реформа идёт волнами до 2028. С 1 января 2026 действует новый Налоговый кодекс РК (№ 214-VIII).

**Старт — ИП на упрощёнке (упрощённая декларация).** ИПН 4% от дохода (акимат может менять 2–6%), плюс пенсионные/соцотчисления/ОСМС. Соцналог на упрощёнке с 2026 не платится. Порог упрощёнки — 600 000 МРП (~2,5 млрд тг/год), лимита по числу сотрудников нет.

**НДС — в твою пользу на упрощёнке.** Плательщиками НДС с 2026 могут быть только на ОУР. На упрощёнке НДС (16%) не начисляешь — даже при превышении 10 000 МРП. Для B2C это прямое ценовое преимущество.

**Критично перед регистрацией:** сверить свой ОКЭД с запретительным перечнем упрощёнки (44 категории, 185 ОКЭД). Производство/продажа одежды обычно проходят, но проверить до подачи.

**Обязательно с первого дня:** онлайн-ККМ и фискальные чеки при онлайн-оплате; проверить, подпадает ли ассортимент под обязательную маркировку; отчётность только онлайн (форма 910 раз в полугодие); учёт себестоимости для ценообразования.

**Переход на ОУР+НДС — плановый, при росте B2B (см. раздел 4), не сюрприз.** На ОУР налог с прибыли (доход минус расходы), а в B2B-мерче расходов много (закупка с НДС зачитывается) — НДС из проблемы становится рабочим механизмом.

## 4. B2B-направление (фаза 2)

Стратегическая цель после B2C-запуска: корпоративный мерч — «брендировать что угодно», подарочные наборы, ручки, одежда, заказы под каждый праздник.

**Налоговое следствие.** Юрлицам нужен НДС-счёт-фактура для вычета. Крупные партии выбивают за порог НДС (10 000 МРП). B2B почти неизбежно тянет на ОУР+НДС. Это не минус — на ОУR расходы зачитываются.

**Продуктовые отличия от B2C (заложить в архитектуру заранее, не перепиливать ядро):**
- Корпоративный бренд-профиль: компания загружает лого и фирменные цвета один раз, они применяются к любому изделию каталога автоматически (`companies`).
- Расширение ассортимента за пределы одежды: ручки, кружки, наборы → новые методы (тампопечать, УФ, гравировка) — уже в схеме методов.
- Оптовое ценообразование: пороги тиража со скидками (`price_tiers`).
- Два сосуществующих потока: self-service с мгновенной оплатой (физлица) И заявочный с менеджером/безналом (юрлица). Для крупного корпоратива модель «заявка → счёт → безнал» оправдана.
- Согласование макета: корпоративный клиент утверждает дизайн перед тиражом (отдельный статус).
- Безналичная оплата по счёту (`orders.payment_method = 'invoice'`).

На старте B2B-структуры заложены в БД, но не активны.

## 5. Стратегия продвижения

Ядро: продукт сам себя продаёт через шаринг дизайна по ссылке (поднят в MVP) и сам кастомайзер. Каждый собранный дизайн = бесплатный охват.

Каналы: Instagram (основной для KZ, дисциплинированная палитра бордо/чёрный/кремовый), TikTok (охват через «собираю мерч» — запись экрана кастомайзера), микро-инфлюенсеры KZ (20–50 локальных, бартер вещью, не макро), коллабы с локальными художниками (продукт + промо одновременно, культурная легитимность).

Платный трафик точечно: узкий таргет (стритвир/граффити/музыка KZ), ретаргет брошенных корзин. Дроп-модель (лимитированные коллекции датами, FOMO) вместо вечной витрины. Реферальная механика поверх шаринга.

Не делать: B2B-риторику для B2C, широкий ассортимент в промо (продвигать 3–4 ключевых изделия), нерелевантных крупных блогеров, конкуренцию ценой с гигантом.

Для таргета обязательна веб-аналитика и пиксели с первого дня (см. раздел 9 и 17).

---

# ЧАСТЬ B — ДИЗАЙН-СИСТЕМА

## 6. Фирменный стиль

### 6.1 Цвета (точные HEX из логотипа)

```css
:root {
  /* Базовая палитра бренда */
  --ink-burgundy: #7A1F28;   /* фирменный бордо: фон hero, CTA, акценты */
  --ink-black:    #111111;   /* леттеринг, основной текст, тёмные кнопки */
  --ink-cream:    #EFE0C1;   /* кремовый: обводка лого, светлый текст на тёмном, фон каталога */

  /* Производные */
  --ink-burgundy-dark: #5E1820;  /* hover на бордо-кнопках */
  --ink-burgundy-light:#9A3540;  /* акценты, бордюры */
  --ink-cream-dark:    #D7C9A6;  /* разделители на кремовом */
  --ink-black-soft:    #1E1E1E;  /* карточки на тёмной теме */

  /* Нейтральные */
  --ink-gray-900: #1A1A1A;
  --ink-gray-600: #555555;
  --ink-gray-400: #9A9A9A;
  --ink-gray-200: #E5E0D8;
  --ink-white:    #FBF8F2;  /* тёплый белый, не чистый #FFF */

  /* Семантические */
  --ink-success: #3E7C5A;
  --ink-warning: #C8922A;
  --ink-error:   #B23A3A;
}
```

### 6.2 Принцип двух контекстов

**Тёмный (бордо-фон + кремовый текст):** hero, лендинг, футер, промо. Атмосфера бренда.
**Светлый (кремовый/белый фон + чёрный текст):** каталог, страница товара, кабинет, и КРИТИЧНО — рабочая зона кастомайзера. Холст кастомайзера всегда нейтральный (цветной фон искажает восприятие принта); бордо — только в панелях вокруг холста.
Бордо — акцент и CTA, не заливка рабочих экранов.

### 6.3 Шрифты

```css
:root {
  --font-display: 'Permanent Marker', 'Bebas Neue', cursive;  /* только крупные заголовки/hero */
  --font-body: 'Manrope', 'Inter', system-ui, sans-serif;      /* текст и весь UI, кириллица */
  --font-mono: 'Space Mono', 'JetBrains Mono', monospace;       /* лейблы/табы, uppercase 0.15em */
}
```

Правила: граффити-шрифт — только латиница и крупный кегль (кириллица тела им не набирается); тело/кнопки/формы — Manrope/Inter; лейблы — моно, uppercase, letter-spacing 0.15em (приём из сабтекста лого).

Шкала: h1 hero 3.5–4.5rem display · h2 2.25rem display · h3 1.5rem body700 · body 1rem · caption 0.875rem · label 0.75rem mono.

### 6.4 Прочие токены

```css
:root {
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgba(17,17,17,0.08);
  --shadow-md: 0 4px 16px rgba(17,17,17,0.12);
  --shadow-lg: 0 12px 40px rgba(17,17,17,0.18);
  --space-unit: 4px;  /* сетка отступов кратна 4px */
  --container-max: 1280px;
}
```

Граффити-эстетика — через дисплейный шрифт, бордо-акценты, фактурные элементы (потёки/брызги в декоре), НЕ через хаотичный UI. Каркас строгий и сеточный.

---

# ЧАСТЬ C — АРХИТЕКТУРА

## 7. Технологический стек

**Frontend + лёгкий бэкенд:** Nuxt 4 (Vue 3, Vite, Nitro), SSR для каталога/SEO. Nuxt UI v4 (бесплатно, Tailwind v4). Konva.js + vue-konva для кастомайзера (только client-side, `<ClientOnly>`). Nitro-эндпоинты: webhook оплаты, смена статуса, отдача каталога.

**Backend-платформа:** Supabase — Postgres, Auth, Storage, RLS, Realtime, Edge Functions.

**Производственный воркер (отложен до фазы автогенерации):** Node+BullMQ или Python+Pillow/ImageMagick для генерации печатного файла (DPI-экспорт, CMYK, припуски). На MVP печатный файл собирает оператор вручную по спецификации.

**Оплата:** один провайдер на старте — ePay (Halyk) ИЛИ Kaspi. CloudPayments/Stripe — позже.

**Логистика KZ:** курьер Алматы/Астана, постаматы/ПВЗ, Kazpost для регионов, CDEK для РФ/СНГ. На старте ручной ввод трека; автотрек через API — вторая волна.

**Веб-аналитика и пиксели (обязательно для таргета):** события воронки (открыл кастомайзер → корзина → checkout → оплата); пиксели Meta/TikTok/Google; событие покупки с суммой по подтверждению оплаты.

**Деплой:** Nuxt → Vercel; Supabase → облако; воркер+Redis → VPS (когда появится).

**НЕ используется на старте (анти-оверинжиниринг):** FSD-архитектура (конфликт с Nuxt 4, оверинжиниринг); автоматическая CMYK-конвертация (заменена дисклеймером + ручной подгонкой); свой VPS под бэкенд (всё закрывает Supabase+Vercel).

## 8. Структура проекта (Nuxt 4, плоская по фичам)

```
inkmade/
├── app/
│   ├── pages/
│   │   ├── index.vue                  # лендинг
│   │   ├── catalog/index.vue, [category].vue
│   │   ├── product/[id].vue
│   │   ├── customize/[id].vue          # кастомайзер (или /constructor?alias=)
│   │   ├── cart.vue, checkout.vue
│   │   ├── order/[id].vue               # статус + трекинг
│   │   ├── account/index.vue, orders.vue, designs.vue
│   │   ├── studio/                      # производство (operator)
│   │   │   ├── index.vue, order/[id].vue
│   │   └── admin/                       # админ (admin)
│   │       ├── index.vue                # дашборд/аналитика
│   │       ├── products/index.vue, new.vue, [id].vue
│   │       ├── prints.vue, stock.vue
│   │       └── orders/index.vue, [id].vue
│   ├── components/
│   │   ├── customizer/  CustomizerCanvas.client.vue, ZoneSelector, DesignUpload,
│   │   │                ProductColorPicker, TextTool, PriceCalculator
│   │   ├── catalog/, landing/, studio/, admin/, ui/
│   ├── composables/  useSupabase, useDesign, useCart, useOrder, usePricing,
│   │                 useAdmin, useAuth (сессия + роль)
│   ├── layouts/  default, account, studio, admin
│   ├── middleware/  auth, studio-role, admin-role
│   └── assets/css/main.css, fonts/
├── server/api/
│   ├── payment/create.post.ts, webhook.post.ts   # webhook — единственный триггер paid
│   ├── orders/[id]/status.post.ts                # серверная смена статуса + лог
│   ├── admin/, catalog/
├── shared/config/  zones.ts, print-methods.ts, pricing.ts
├── supabase/  migrations/, functions/
├── nuxt.config.ts, tailwind.config.ts, package.json
```

Автоимпорт Nuxt на MVP оставлен. При вводе FSD позже — отключить для доменных папок.

## 9. Окружение и секреты

`.env` локально + настройки Vercel в проде, не коммитятся.

```
# Supabase
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # СЕКРЕТ, только сервер, обходит RLS
# Оплата
PAYMENT_MERCHANT_ID=
PAYMENT_SECRET_KEY=               # СЕКРЕТ
PAYMENT_WEBHOOK_SECRET=           # СЕКРЕТ, проверка подписи webhook
# Прочее
NUXT_PUBLIC_SITE_URL=
# Аналитика и пиксели
NUXT_PUBLIC_META_PIXEL_ID=
NUXT_PUBLIC_TIKTOK_PIXEL_ID=
NUXT_PUBLIC_ANALYTICS_ID=
```

Правило: SERVICE_ROLE_KEY и платёжные секреты — только в серверном слое (Nitro/Edge). Клиент работает с anon-ключом под RLS.

---

# ЧАСТЬ D — БАЗА ДАННЫХ

## 10. Принцип масштаба принта

Принт позиционируется в физических миллиметрах зоны печати, зона задана отдельно для каждого размера изделия. Konva рендерит мокап, но границы и размер принта вычисляет из мм зоны для выбранного размера. Поэтому `print_zones` привязана к паре «товар + размер».

Референсные данные индустрии (стартовые): грудь/спина муж ≈ 280×380 мм, жен ≈ 230×380 мм; максимум DTG до 300×420 мм; рек. принт на груди ~300 мм (муж)/~280 (жен), отступ от горловины 70–90/60–70 мм; нагрудный лого 90–100 мм. Сетки (полуобхват груди/длина, см): S≈50/70, M≈52/72, L≈54/74, XL≈56/76, XXL≈58/78; оверсайз шире и короче, спущенное плечо.

## 11. Каталог

### 11.1 products
```sql
products (
  id uuid pk, slug text unique, alias text unique,   -- alias для URL конструктора
  title text,
  product_kind text,    -- 'apparel'|'accessory'|'drinkware'|'stationery'|'giftset'
  category text,        -- 'tshirt'|'hoodie'|'sweatshirt'|'cap'|'bag'|'mug'|'pen'...
  gender text,          -- 'male'|'female'|'unisex'|'kids'
  fit_type text,        -- 'regular'|'oversize'|null
  fabric_id uuid fk -> fabrics,
  brand text, fabric_weight integer, composition text,
  base_price numeric, cost_price numeric,            -- себестоимость, не показывать клиенту
  description text,
  is_b2b_only boolean default false,
  is_active boolean default true,                     -- черновик/опубликован
  created_at timestamptz default now()
)
```

### 11.2 product_sizes (размерная сетка)
```sql
product_sizes (
  id uuid pk, product_id uuid fk -> products,
  size_label text,      -- 'S'|'M'|'L'|'XL'|'XXL'|'OS'
  sort_order integer,
  chest_half_cm numeric, length_cm numeric, shoulder_cm numeric, sleeve_cm numeric,
  fit_chest_min_cm numeric, fit_chest_max_cm numeric,   -- для подбора размера
  fit_height_min_cm integer, fit_height_max_cm integer
)
```
Референс (футболка, обычная посадка): S 50/70/44/22 · M 52/72/46/23 · L 54/74/48/24 · XL 56/76/50/25 · XXL 58/78/52/26 (chest_half/length/shoulder/sleeve, см). Оверсайз — отдельные строки.

### 11.3 product_variants
```sql
product_variants (
  id uuid pk, product_id uuid fk -> products, size_id uuid fk -> product_sizes,
  color_name text, color_hex text,    -- для перекраски мокапа
  is_dark boolean,                     -- тёмный → нужна белая подложка
  stock integer default 0,             -- денормализ., истина в stock_movements
  sku text unique, extra_price numeric default 0,
  supplier_id uuid fk -> suppliers null
)
```

### 11.4 product_images (мокапы с опорными точками)
```sql
product_images (
  id uuid pk, product_id uuid fk -> products,
  variant_id uuid fk -> product_variants null,
  view text,    -- 'front'|'back'|'sleeve_left'|'sleeve_right'|'catalog'
  url text, is_primary boolean default false, sort_order integer default 0,
  anchor jsonb  -- {neck_x, neck_y, chest_center_x, chest_center_y, px_per_mm}
)
```
`anchor.px_per_mm` — перевод мм зоны в пиксели этого мокапа. Связующее звено между физическими мм и пикселями Konva.

## 12. Методы нанесения и матрица ограничений (ядро «выбрал метод → ограничения»)

### 12.1 print_methods
```sql
print_methods (
  id uuid pk, code text unique,  -- 'dtg'|'dtf'|'sublimation'|'silkscreen'|'embroidery'|'tampo'|'uv'|'engraving'
  title text, surface_class text,  -- 'textile'|'hard'
  print_mode text,                 -- 'zonal'|'fullprint'
  supports_photo boolean, supports_gradient boolean,
  max_colors integer,              -- шелкография 1–4; DTG/субл null=полноцвет
  needs_white_base boolean,        -- белая подложка на тёмном
  min_line_mm numeric,             -- ≈0.6
  min_font_pt numeric, min_dpi integer default 300,
  file_formats text[], requires_vector boolean default false,
  base_setup_fee numeric default 0,   -- выше для шелкографии/вышивки
  is_active boolean default true
)
```
Стартовые методы: dtg (textile/zonal/фото/полноцвет/белподложка), dtf (textile/zonal/фото), sublimation (textile/fullprint/только светлая синтетика), silkscreen (textile/zonal/без фото/1–4 цвета/тираж), embroidery (textile/zonal/без фото/малые зоны), tampo (hard/1–2 цвета/ручки), uv (hard/фото/кружки), engraving (hard/монохром).

### 12.2 fabrics
```sql
fabrics (
  id uuid pk, code text unique,  -- 'cotton'|'poly'|'blend'|'ceramic'|'metal'|'plastic'|'canvas'
  title text, surface_class text, is_synthetic boolean
)
```

### 12.3 method_fabric_rules (матрица совместимости)
```sql
method_fabric_rules (
  id uuid pk, method_id uuid fk -> print_methods, fabric_id uuid fk -> fabrics,
  is_allowed boolean default true, surcharge numeric default 0, note text
)
```
Матрица (✓/✗): DTG — хлопок✓ синтетика✗; DTF — хлопок✓ синтетика✓; Сублимация — только светлая синтетика✓; Шелкография — текстиль✓; Вышивка — текстиль✓; Тампо — металл/пластик✓; УФ — керамика/металл/пластик✓; Гравировка — металл✓.

### 12.4 print_zones (мм для пары товар+размер)
```sql
print_zones (
  id uuid pk, product_id uuid fk -> products, size_id uuid fk -> product_sizes,
  code text,  -- 'chest'|'back'|'sleeve_left'|'left_chest'|'fullprint'|'surface'
  title text, print_mode text,
  x_mm numeric, y_mm numeric, width_mm numeric, height_mm numeric,
  rec_width_mm numeric, neck_offset_mm numeric,
  min_dpi integer default 300, placement_hint text
)
```
Референс (футболка, грудь, мм): S 260×350 · M 270×360 · L 280×380 · XL 290×400 · XXL 300×420. Нагрудный лого 100×100. DPI-порог от макс. размера линейки.

### 12.5 zone_method_rules
```sql
zone_method_rules (
  id uuid pk, zone_id uuid fk -> print_zones, method_id uuid fk -> print_methods,
  is_allowed boolean default true, max_width_mm numeric, note text
)
```

### 12.6 Цепочка валидации (логика «метод → ограничения»)
1. Товар → известны fabric и product_kind.
2. Доступные методы = method_fabric_rules где ткань совпадает и is_allowed.
3. Метод → print_mode → доступные зоны из print_zones + zone_method_rules.
4. Принт → проверка против print_methods: фото при supports_photo=false → блок; цветов > max_colors → предупреждение; линии < min_line_mm → предупреждение; DPI < min_dpi на макс. размере → блок; формат не в file_formats → блок.
5. is_dark + needs_white_base → стоимость подложки.
6. Размер принта vs границы зоны → нельзя выйти.

## 13. Дизайн пользователя и артефакты

### 13.1 designs
```sql
designs (
  id uuid pk, user_id uuid fk -> auth.users null,   -- null для гостя до логина
  product_id uuid fk -> products, variant_id uuid fk -> product_variants,
  method_id uuid fk -> print_methods,
  composition_url text,        -- СКРИНШОТ композиции (сжатый, для глаз, НЕ для печати)
  moderation_status text default 'pending',  -- 'pending'|'approved'|'rejected'
  moderation_note text,
  is_saved boolean default false, share_token text unique,
  created_at timestamptz default now()
)
```

### 13.2 ТРИ визуальных артефакта (не путать при разработке)
1. **Скриншот композиции** (`designs.composition_url`) — экспорт canvas (Konva.toBlob), один раз при фиксации, сжатый PNG/WebP. Для наглядности оператору/клиенту. НЕ для печати.
2. **Оригинал-файл** (`design_placements.asset_url`) — исходник в полном разрешении, приватный Storage. Оператор скачивает для печати.
3. **Облегчённое превью** (`design_placements.preview_asset_url`) — лёгкая версия для отрисовки в Konva. Пользователь возит её, оригинал не рендерится в реальном времени. Защита от перегруза.

Точные размеры в заказ — из мм-координат `design_placements`, НЕ из скриншота.

### 13.3 design_placements (мультизона)
```sql
design_placements (
  id uuid pk, design_id uuid fk -> designs, zone_id uuid fk -> print_zones,
  source text,                 -- 'upload'|'library'|'text'
  asset_url text null,         -- ОРИГИНАЛ для печати
  preview_asset_url text null, -- облегчённое для Konva
  library_id uuid fk -> print_library null,
  text_content text null, text_font text null, text_color text null,
  x_mm numeric, y_mm numeric, width_mm numeric, height_mm numeric,  -- СПЕЦИФИКАЦИЯ для цеха
  rotation_deg numeric default 0, layer integer default 1
)
```
Поток фиксации: клиент свободно двигает/масштабирует/вращает в Konva (только браузер, сервер не задействован) → при добавлении в корзину пиксели Konva → пересчёт в мм через px_per_mm зоны → запись x/y/width/height/rotation_mm + разовый скриншот в composition_url. Оригинал уже в Storage с загрузки.

### 13.4 print_library
```sql
print_library (
  id uuid pk, title text, file_url text, thumbnail_url text,
  author text, royalty_pct numeric default 0, tags text[],
  compatible_methods text[],   -- фото нельзя в вышивку
  is_active boolean default true
)
```

## 14. Ценообразование

### 14.1 pricing_rules (факторы в данных, не в коде)
```sql
pricing_rules (
  id uuid pk, scope text,  -- 'global'|product_id|method_id
  rule_type text, params jsonb, is_active boolean default true
)
```
rule_type: `area_step` (ступени площади A5/A4/A3) · `color_count` (надбавка за цвета, шелкография) · `white_base` (подложка на тёмном) · `extra_zone` (доп. зона сверх первой) · `fullprint` (ставка full-print) · `method_setup` (стартовый сбор тиражных методов).

Формула позиции:
```
unit_price = base_price + extra_price(размер/цвет)
  + method_fabric_rules.surcharge
  + Σ по зонам (зональная ставка × area_step)
  + color_count (шелкография) + white_base (если is_dark и needs_white_base)
  + method_setup (разово) + text_cost
итог = unit_price × qty − скидки (price_tiers/promo)
```

### 14.2 price_tiers (опт, B2B)
```sql
price_tiers (
  id uuid pk, product_id uuid fk null, method_id uuid fk null,
  qty_from integer, qty_to integer null, discount_pct numeric, fixed_unit numeric null
)
```
Пороги: 1 / 10–49 / 50–99 / 100–499 / 500+. На B2C активен только «1».

### 14.3 promo_codes
```sql
promo_codes (
  id uuid pk, code text unique, discount_type text, value numeric,
  min_order numeric default 0, valid_from timestamptz, valid_to timestamptz,
  usage_limit integer null, used_count integer default 0, is_active boolean default true
)
```

## 15. Заказы и производство

### 15.1 Статус-автомат
```
created → pending → paid → queued → printing → quality_check → packing → ready_to_ship → shipped → delivered
боковые: on_hold (пауза с причиной) · reprint (брак → повторная печать) · cancelled · refunded
```
paid — ТОЛЬКО по серверному webhook (не редирект). Гранулярность (queued/printing/quality_check/packing/ready_to_ship) отвечает «что в типографии, что на отгрузке». Клиенту показывается укрупнённо. reprint не создаёт новый заказ.

### 15.2 Таблицы
```sql
orders (
  id uuid pk, user_id uuid fk -> auth.users, company_id uuid fk -> companies null,
  order_type text default 'b2c',   -- 'b2c'|'b2b'
  status text, subtotal numeric, discount numeric default 0,
  shipping_cost numeric default 0, total numeric, currency text default 'KZT',
  payment_method text,             -- 'card'|'kaspi'|'invoice'
  tax_mode text,                   -- 'simplified'|'ovr_vat' — налоговый режим на момент заказа
  fiscal_receipt jsonb,            -- данные фискального чека (ККМ)
  shipping_method_id uuid fk -> shipping_methods, address_id uuid fk -> addresses,
  tracking_no text, carrier text,
  created_at timestamptz default now(), paid_at timestamptz, shipped_at timestamptz
)
order_items (
  id uuid pk, order_id uuid fk -> orders, design_id uuid fk -> designs,
  variant_id uuid fk -> product_variants, method_id uuid fk -> print_methods,
  quantity integer default 1, unit_price numeric, line_total numeric,
  unit_cost numeric    -- себестоимость позиции (заготовка+материалы), для маржи
)
order_status_log (
  id uuid pk, order_id uuid fk -> orders, from_status text, to_status text,
  actor_id uuid fk -> auth.users, note text, created_at timestamptz default now()
)
payments (
  id uuid pk, order_id uuid fk -> orders, provider text, provider_txn text,
  amount numeric, status text, raw_payload jsonb, created_at timestamptz default now()
)
stock_movements (
  id uuid pk, variant_id uuid fk -> product_variants, delta integer,
  reason text,   -- 'purchase'|'order'|'correction'|'defect'
  order_id uuid fk -> orders null, actor_id uuid fk -> auth.users,
  created_at timestamptz default now()
)
```
`stock_movements` — источник истины по остаткам; `variants.stock` денормализован. При оплате −1 (order); при браке −1 (defect).

## 16. Пользователи, доставка, B2B

```sql
profiles (
  id uuid pk fk -> auth.users, role text default 'customer',  -- 'customer'|'operator'|'admin'
  full_name text, phone text, company_id uuid fk -> companies null,
  created_at timestamptz default now()
)
addresses (
  id uuid pk, user_id uuid fk -> auth.users, recipient text, phone text,
  city text, line text, postcode text, is_default boolean default false
)
shipping_methods (
  id uuid pk, code text,  -- 'courier_almaty'|'pickup'|'postamat'|'kazpost'|'cdek'
  title text, base_cost numeric, cost_rules jsonb, is_active boolean default true
)
suppliers (   -- справочник поставщиков заготовок
  id uuid pk, name text, contact text, note text, is_active boolean default true
)
companies (   -- B2B бренд-профиль (фаза 2)
  id uuid pk, name text, bin text,   -- БИН РК
  logo_url text, brand_colors jsonb, contact_email text, contact_phone text,
  payment_terms text, created_at timestamptz default now()
)
```
`companies` — идея «брендировать что угодно»: лого/цвета применяются к любому изделию для сотрудников компании. На старте не активна.

## 17. Юридический и операционный слой

### 17.1 Критично для MVP (легальность и деньги)

```sql
-- Согласия пользователя (ToS, передача ответственности за копирайт)
user_consents (
  id uuid pk, user_id uuid fk -> auth.users null, order_id uuid fk -> orders null,
  consent_type text,   -- 'tos'|'copyright'|'privacy'
  doc_version text,    -- версия принятого документа
  accepted_at timestamptz default now(), ip text
)
-- Модерация дизайнов — статус уже в designs (moderation_status/note).
-- Фискализация — fiscal_receipt и tax_mode уже в orders.
-- Себестоимость/маржа — cost_price в products, unit_cost в order_items.
-- Расход материалов на нанесение (для точной себестоимости):
material_usage (
  id uuid pk, order_item_id uuid fk -> order_items,
  material text,   -- 'ink'|'film'|'thread'|'blank'
  qty numeric, unit text, cost numeric
)
```

Зачем: согласия — юридическая защита при споре о принте; модерация — контроль запрещёнки/копирайта до печати; фискальный чек — требование закона РК при онлайн-оплате; себестоимость — реальная маржа.

### 17.2 Вторая волна (после запуска)

```sql
returns (   -- возвраты/рекламации (кастом-вещи — тонкая юр. тема)
  id uuid pk, order_id uuid fk -> orders, order_item_id uuid fk -> order_items,
  reason text, photo_urls text[], status text, resolution text,
  refund_amount numeric, created_at timestamptz default now()
)
notifications (   -- уведомления клиенту по смене статуса
  id uuid pk, user_id uuid fk -> auth.users, order_id uuid fk -> orders null,
  channel text,   -- 'email'|'sms'|'whatsapp'|'push'
  template text, status text, sent_at timestamptz
)
reviews (   -- отзывы и рейтинги (доверие нового бренда)
  id uuid pk, user_id uuid fk -> auth.users, product_id uuid fk -> products,
  order_id uuid fk -> orders null, rating integer, text text, photo_urls text[],
  is_published boolean default false, created_at timestamptz default now()
)
wishlists (   -- избранное
  id uuid pk, user_id uuid fk -> auth.users,
  product_id uuid fk -> products null, design_id uuid fk -> designs null
)
admin_audit_log (   -- аудит действий в админке
  id uuid pk, actor_id uuid fk -> auth.users, action text, entity text,
  entity_id uuid, before jsonb, after jsonb, created_at timestamptz default now()
)
platform_settings (   -- глобальные настройки (валюта, сроки, контакты, дисклеймеры)
  key text pk, value jsonb
)
content_pages (   -- FAQ, политики, о нас, блог
  id uuid pk, slug text unique, title text, body text, is_published boolean default false
)
-- B2B фаза 2:
company_members (   -- сотрудники корпоративного клиента
  id uuid pk, company_id uuid fk -> companies, user_id uuid fk -> auth.users, role text
)
b2b_invoices (   -- счета/договоры безнал
  id uuid pk, order_id uuid fk -> orders, company_id uuid fk -> companies,
  invoice_no text, amount numeric, vat_amount numeric, status text, issued_at timestamptz
)
design_approvals (   -- согласование макета корпоративным клиентом перед тиражом
  id uuid pk, design_id uuid fk -> designs, company_id uuid fk -> companies,
  status text, approved_by uuid, approved_at timestamptz
)
```

### 17.3 RLS-политики (роль из profiles.role)
- designs/orders/order_items: клиент — свои (user_id=auth.uid()); operator/admin — все оплаченные.
- order_status_log/stock_movements/material_usage/admin_audit_log: только operator/admin.
- products/materials/print_zones/variants/product_images/print_library/content_pages: публичное чтение опубликованных, запись только admin.
- profiles: свой профиль; роль меняет только admin.
- user_consents/returns/reviews/wishlists/addresses: клиент — свои.
- Storage: бакет каталога (фото/мокапы) — публичное чтение; бакет дизайнов (оригиналы/печатные файлы) — приватный, подписанные URL + роль.

Ошибка в RLS = утечка чужих дизайнов/заказов или повышение роли. Проверка политик — обязательный пункт перед релизом.

## 18. Карта таблиц (полная)

```
КАТАЛОГ:        products, product_sizes, product_variants, product_images
НАНЕСЕНИЕ:      print_methods, fabrics, method_fabric_rules, print_zones, zone_method_rules
ДИЗАЙН:         designs, design_placements, print_library
ЦЕНА:           pricing_rules, price_tiers, promo_codes
ЗАКАЗЫ/ПРОИЗВ:  orders, order_items, order_status_log, payments, stock_movements, material_usage
ПОЛЬЗ/ДОСТАВКА: profiles, addresses, shipping_methods, suppliers, companies
ЮР/ОПЕРАЦ:      user_consents (MVP)
ВТОРАЯ ВОЛНА:   returns, notifications, reviews, wishlists, admin_audit_log,
                platform_settings, content_pages, company_members, b2b_invoices, design_approvals
```

---

# ЧАСТЬ E — ФУНКЦИОНАЛЬНОСТЬ

## 19. Кастомайзер (главный экран)

Порядок шагов: изделие → материал → зона → принт/текст → размещение → цена → корзина. Материал раньше принта, потому что задаёт метод и зоны.

Состав:
- Холст Konva (client-only), нейтральный фон, мокап + принт.
- Выбор материала первым — определяет метод и доступные зоны (раздел 12).
- Выбор зоны — только валидные для режима материала.
- Загрузка принта + DPI-валидация от макс. размера. Форматы PNG/JPG/SVG/PDF, лимит 25 МБ, RGB (конвертация на стороне цеха).
- Выбор из библиотеки принтов (курируемая галерея).
- Текстовый инструмент: надпись/имя граффити-шрифтом, выбор шрифта/цвета/размера. Полноценный модуль.
- Выбор цвета изделия — превью перекрашивается в реальном времени.
- Позиционирование: свободно двигать/масштабировать/вращать в границах зоны (нельзя выйти за зону).
- Подсказки по зонам (рисунок чуть ниже центра груди и т.п.).
- Калькулятор цены в реальном времени.
- Реалистичное превью: мокап с тенями/фактурой под выбранный цвет.

URL-схема: `/customize/[id]` или `/constructor?alias=` (SEO, прямые ссылки), alias в products.

Производительность: Konva рендерит облегчённое превью принта, оригинал — отдельно (раздел 13.2). Никакого перегруза: трансформации — только в браузере, сервер не задействован; скриншот композиции — разово при фиксации.

## 20. Лендинг

Визуальный язык с merchstudio.ru, бизнес-логика B2C self-service.
1. Hero (тёмный): лого, H1 граффити, CTA «Создать свой принт» → прямо в кастомайзер.
2. Лента примеров кастомизации (галерея пользователей).
3. Каталог плитками по категориям.
4. Методы нанесения (аккордеон): DTG/DTF/сублимация на старте; шелкография/вышивка позже. Не анонсировать то, чего цех не делает.
5. «Как это работает»: выбери → загрузи/выбери принт → размести → оплати → получи.
6. FAQ (аккордеон): оплата, доставка, сроки, возвраты, расхождение цвета.
7. Футер: контакты, соцсети, разделы, политики.

## 21. Роли и кабинеты

Три роли (`profiles.role`), три кабинета, строгое разделение по middleware.

| Роль | Кабинет | Задача |
|---|---|---|
| customer | `/account` | свои заказы, дизайны, трекинг |
| operator | `/studio` | очередь, этапы печати, контроль качества, упаковка, отгрузка |
| admin | `/admin` | каталог, контент, цены, все заказы, склад, аналитика, роли |

На старте operator и admin может быть один человек, но роли разделены.

### 21.1 Админ-кабинет (`/admin`)
- **Мастер создания товара** (6 шагов): основное+описание → материалы (автометод по 12.3) → варианты цвет×размер (матрица, SKU, остаток) → зоны печати в мм + мокапы → фото галереи → публикация (черновик→опубликовано, предпросмотр).
- Библиотека принтов: загрузка, теги, роялти, модерация.
- Обзор заказов: все, фильтры по этапам, карточка с логом статусов, ручное управление (on_hold/cancel/refund).
- Склад: остатки, приход (stock_movements +N), коррекция, подсветка низких.
- Аналитика: из БД — выручка, заказы по статусам, топ изделий/принтов, доля брака (reprint), оборачиваемость. Поведенческие метрики (конверсия кастомайзера, брошенные корзины) — внешняя веб-аналитика (раздел 7), не из БД (гость собирает локально).

### 21.2 Производственный кабинет (`/studio`)
- Очередь оплаченных на Realtime, доска по этапам (queued/printing/quality_check/packing/ready_to_ship) — видно «что в типографии, что на отгрузке».
- Карточка заказа: оригинал принта (скачать), спецификация в мм, тип/цвет/размер/материал заготовки, метод, количество.
- Смена этапа по автомату 15.1 → пишет order_status_log. Брак → reprint с причиной. Проблема → on_hold.
- Отгрузка: ready_to_ship→shipped с вводом трека и перевозчика.
- Списание заготовок: авто при оплате; defect при браке.

## 22. Бизнес-процессы

1. **Заведение товара.** admin → мастер → черновик → фото/мокапы → предпросмотр → публикация. Товар без мокапа/зон не публикуется.
2. **Обработка заказа.** оплата → paid + списание заготовки → queued → printing → quality_check (годен→packing, брак→reprint) → ready_to_ship → shipped+трек → delivered. Без paid в печать не уходит; без трека не отгружается.
3. **Контроль качества/брак.** quality_check: сверка со спецификацией. Брак → reprint + причина + defect в stock_movements. Повторная печать без доплаты клиента. Причина обязательна.
4. **Пауза.** on_hold с обязательной причиной (макет/оплата/остаток). Возврат на этап или отмена.
5. **Отмена/возврат.** до отгрузки cancelled; при оплаченном refunded (возврат через провайдера вручную). Возврат заготовки при отмене до печати. Кастом-вещи — возврат юридически ограничен (returns).
6. **Пополнение склада.** admin вносит приход (stock_movements +N) → варианты снова доступны.

Техника: смена статуса — серверное действие (`server/api/orders/[id]/status.post.ts`) с проверкой роли и валидацией перехода по автомату, запись status + log в одной транзакции.

## 23. Поток «оплата → производство → доставка»

1. Кастомайзер → корзина: оригинал + spec сохранены, design создан.
2. Checkout: order created → pending. Гость логинится перед оплатой (раздел далее).
3. Платёж ePay/Kaspi на стороне провайдера.
4. Webhook на `server/api/payment/webhook.post.ts` (или Edge Function).
5. Webhook валидирует подпись → payments → status=paid, paid_at → списание заготовки → первый order_status_log → фискальный чек.
6. Заказ в очереди /studio (queued) через Realtime.
7. Оператор ведёт по этапам (печатный файл на MVP — вручную по спецификации). Каждый переход — в лог.
8. ready_to_ship→shipped + трек. Клиент видит на /order/[id].
9. delivered.

### 23.1 Гостевой поток и точка логина
Просмотр каталога, сборка дизайна, корзина — гостю без логина (локально в сессии). Логин требуется на checkout перед оплатой (заказ привязан к user_id, RLS требует auth.uid()). При логине локальный дизайн/корзина переносятся в аккаунт. Шаринг и сохранение дизайна требуют логина. Без капчи на старте, чтобы не терять конверсию.

---

# ЧАСТЬ F — ЗАПУСК

## 24. Инварианты (что нельзя упрощать)

1. **DPI-валидация от МАКСИМАЛЬНОГО размера изделия** (products.max через зоны XXL/оверсайз). Файл ниже порога (мин. 150, цель 300) — блок. Иначе брак и возвраты.
2. **Webhook — единственный триггер `paid`.** Не редирект. Проверка подписи. Иначе бесплатные заказы.
3. **RLS-политики Supabase.** Клиент — только свои данные. Проверить до релиза.

Также обязательно: ToS + перенос ответственности за копирайт (user_consents), модерация загрузок, дисклеймер о расхождении цвета, фискальный чек.

## 25. Дорожная карта функций

### 25.1 MVP (без этого продукта нет)
- Каталог изделий + страница товара (выбор материала → метод/зоны).
- Кастомайзер: холст, материал→зоны, загрузка+DPI, позиционирование, выбор цвета, реалистичное превью, калькулятор цены, текстовый инструмент.
- Курируемый каталог готовых дизайнов (отдельный канал).
- Auth + гостевой поток + роли (customer/operator/admin).
- Админ-кабинет: мастер товара, каталог, обзор заказов с логом, склад.
- Сохранённые дизайны (is_saved) + шаринг по ссылке (share_token) — ради таргета в MVP.
- Корзина + checkout + один платёжный провайдер + webhook.
- Производственный кабинет на Realtime по этапам + лог.
- Трекинг (ручной ввод трека).
- Юр.слой: user_consents, модерация дизайнов, фискальный чек, себестоимость.
- Веб-аналитика + пиксели.

Приоритет в кастомайзере: превью + цвет изделия + калькулятор + текст. Без них не конвертит.

### 25.2 Вторая волна
Расширение библиотеки принтов (теги/поиск, художники с роялти), реферальная механика, реордер, автотрек через API перевозчиков, шелкография/вышивка, возвраты, уведомления (email/SMS/WhatsApp), отзывы, избранное, аудит админа, настройки платформы, контент-страницы.

### 25.3 Третья волна
AI-генерация принта, AR-примерка, витрина сообщества с роялти, профили художников, автогенерация печатного файла (воркер: DPI/CMYK/припуски), 3D-превью, мультивалюта, казахский язык, FSD-рефакторинг. Полный B2B-контур (companies активны, company_members, b2b_invoices, design_approvals, опт price_tiers).

## 26. Порядок сборки

1. Инициализация: Nuxt 4 + Nuxt UI v4 + Tailwind v4 + фирменные токены, layouts, шрифты.
2. Supabase: миграции схемы (часть D), бакеты Storage, RLS, роли. Проверить RLS.
3. Auth и роли: profiles, middleware auth/studio-role/admin-role.
4. Админ-кабинет (каталог): мастер товара, загрузка фото, склад. Сначала кабинет — каталог нечем наполнить иначе.
5. Каталог (витрина): категории, товар, выбор материала, SSR, URL по alias.
6. Кастомайзер: Konva client-only, материал→зоны, загрузка+DPI, px↔мм, текст, цвет, подсказки, превью, spec в useDesign.
7. Каталог готовых дизайнов: print_library, добавление в корзину.
8. Калькулятор цены: pricing.ts, реактивный пересчёт.
9. Корзина + checkout: useCart, order/design, гость+логин перед оплатой, user_consents.
10. Оплата: один провайдер, payment/*, webhook с подписью, списание заготовки, фискальный чек, первый лог.
11. Производственный кабинет: /studio, Realtime по этапам, серверная смена статуса с логом, остатки.
12. Обзор заказов в админке: фильтры по этапам, лог, ручное управление.
13. Трекинг: страница заказа, укрупнённые статусы, ввод трека.
14. Модерация дизайнов: статус в админке до печати.
15. Лендинг: hero, методы, как работает, FAQ, футер.
16. Юридическое: ToS, политика, дисклеймеры, согласия.
17. Аналитика и пиксели: события воронки, Meta/TikTok, событие покупки с суммой.
18. Деплой: Vercel + Supabase. Проверка трёх инвариантов + срабатывания пикселя покупки на тестовом заказе.

## 27. Расширенный функционал (бэклог, детали)

Конверсия: AI-генерация принта по тексту (убивает барьер не-дизайнера), AR-примерка через камеру, подсказки качества в реальном времени.
Чек/возврат: парные/групповые дизайны, кошелёк с кэшбэком, гардеробы дизайнов, реордер в один клик.
Социальное: витрина сообщества с роялти (курируемо), профили локальных художников, дроп-календарь с напоминаниями.
Доверие: прозрачный трекинг с фото готовой вещи перед отправкой, реферальная механика.
Отвергнуто: открытый маркетплейс самозалива, чат-консультант (убивает self-service), геймификация без выгоды, подписка (рано).

## 28. Открытые вопросы и сводка

### 28.1 Открытые (решает владелец, не дефект документа)
- Конкретные ставки в формуле цены (зональные ставки, коэффициенты площади, надбавки) — из себестоимости и экономики.
- Выбор ePay vs Kaspi — по договору с провайдером.
- Финальные размеры зон и сетки — из спецификаций поставщика заготовок.
- Ставка ИПН в акимате Алматы (коридор 2–6%) — уточнить в КГД.
- Подпадает ли ассортимент под обязательную маркировку — уточнить.

### 28.2 Сводка
| Аспект | Решение |
|---|---|
| Модель | B2C POD, тираж от 1, самообслуживание; B2B — фаза 2 |
| Производство | Своё: DTG/DTF/сублимация (старт), +шелкография/вышивка/не-текстиль позже |
| Каналы продаж | Кастомизация + курируемый каталог готовых дизайнов |
| Связь печати | Материал → метод → зоны (жёсткая) |
| Масштаб принта | Зоны в мм per размер + px_per_mm мокапа |
| Артефакты дизайна | composition_url (скриншот) · asset_url (оригинал) · preview_asset_url (для Konva) |
| Frontend | Nuxt 4 + Nuxt UI v4 + Tailwind v4 + Konva (client-only) |
| Backend | Supabase (Postgres/Auth/Storage/RLS/Realtime/Edge) |
| Оплата | Один провайдер (ePay/Kaspi) + webhook-триггер |
| Налоги | ИП упрощёнка 4% без НДС (старт); ОУР+НДС при B2B |
| Роли/кабинеты | customer /account · operator /studio · admin /admin |
| Прослеживаемость | Гранулярный автомат + order_status_log |
| Цвета | #7A1F28 · #111111 · #EFE0C1 |
| Шрифты | Граффити (заголовки) + Manrope/Inter (текст) + моно (лейблы) |
| Рынок | Казахстан, ru-интерфейс |
| Инварианты | DPI от макс. размера · webhook-триггер · RLS |
| Преимущество | Бренд, эстетика, качество печати — где гигант слаб |

---

*INKMADE Merch Studio · Мастер-документ проекта*
