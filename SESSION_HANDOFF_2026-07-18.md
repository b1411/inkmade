# Session handoff — B2B-магазины: аудит, фиксы, шаблоны, подготовка субдоменов

**Дата:** 2026-07-18 · **Ветка:** main · **Статус:** всё в рабочем дереве, **НЕ закоммичено/не запушено** (деплой за владельцем).

**Гейты (последний успешный прогон):** `typecheck exit 0` · `unit tests 220 passed` (было 203, +17 новых `tenant.test.ts`) · migrations для отгруженного кода **не требуются**.

> ⚠️ К концу сессии safety-classifier (ложное срабатывание кибер-флага в под-агенте аудита) начал каскадно блокировать прогоны тестов, браузер, запись в авто-память и публикацию. Поэтому: последние UI-правки (онбординг) подтверждены только `typecheck 0` — тесты не перезапускались (но затронутый код юнит-тестами не покрыт, i18n-паритет ru/kk сохранён). **Перед деплоем прогнать `npm run typecheck` и `npm test` локально** + ручной smoke (чек-лист ниже).

---

## 1. 🔴→✅ Критический блокер: товар витрины невозможно было опубликовать

**Симптом:** self-serve воронка мертва — активную позицию витрины нельзя создать, магазин остаётся пустым.
**Причина:** guard `guard_shop_item` (миграция 0086, В ПРОДЕ) требует разрешимый вариант у активной позиции, но конструктор при сохранении дизайна терял выбранный вариант → `designs.variant_id = null` → guard отклонял. В проде не всплыло только потому, что там 0 магазинов.

**Фикс (5 аддитивных правок, без миграции):** провёл выбранный `selectedVariant` через весь путь сохранения + серверную валидацию «вариант принадлежит продукту» (вставка идёт сервисной ролью).

| Файл | Изменение |
|---|---|
| `server/utils/schemas.ts` | `designImportSchema` += `variantId` (nullish) |
| `app/pages/customize/[id].vue` | `onSaveDesign` шлёт `variantId: selectedVariant?.id` (и для гостя) |
| `server/api/designs/import.post.ts` | валидирует `variant_id` по продукту и пишет в `designs` |
| `app/composables/useGuestDesigns.ts` | `GuestDesign.variantId?` |
| `app/plugins/guest-import.client.ts` | прокидывает `variantId` при переносе гостевых дизайнов |

**Примечание:** дизайны, сохранённые ДО этого фикса, имеют `variant_id = null` и всё ещё непубликуемы как активные — их нужно пересохранить. В проде таких ~0.

---

## 2. ✅ Шаблоны фирменной витрины (было: пресеты меняли только цвет)

Компания одним кликом выбирает шаблон под нишу — задаётся тема + hero (раскладка/затемнение) + секции (объявление/«о нас»/порядок) + форма карточек + готовые тексты-подсказки. Дальше меняет логотип, фото баннера и текст на свои.

| Файл | Изменение |
|---|---|
| `shared/config/shop-theme.ts` | `STOREFRONT_TEMPLATES` (5 шт.) + тип `StorefrontTemplate` |
| `app/pages/shop-admin/branding.vue` | панель-галерея сверху + `applyTemplate()` (с confirm-перезаписью через `useConfirm`; НЕ трогает логотип/баннер/контакты/товары) |
| `i18n/locales/{ru,kk}/shopadmin.json` | namespace `shopAdmin.templates.*` |

**Шаблоны:** `corporate` (компании/банки/IT), `university` (вузы/школы), `startup` (продукт-команды), `drop` (тёмная, события/лимитки), `minimal` (премиум/бутик). Тексты резолвятся из i18n по ключу шаблона, поэтому конфиг нейтрален к языку.

На карточке каждого шаблона — подсказка `photoHint` («какое фирменное фото загрузить в баннер»: офис/кампус/продукт/…), чтобы компания сразу понимала, чем сделать витрину фирменной.

---

## 3. ✅ Подготовка субдоменов (host-независимый слой + шов), за флагом `subdomains=false`

На Vercel поведение не меняется (флаг off = полный no-op). После переезда на свой хостинг в РК включение = флаг + `NUXT_PUBLIC_COOKIE_DOMAIN=.inkmade.kz` + один драйвер провижининга.

**Новые файлы:**
| Файл | Назначение |
|---|---|
| `shared/utils/tenant.ts` | чистый резолвер `<slug>.inkmade.kz → slug` (+ reserved-лист, зеркало 0086) |
| `tests/tenant.test.ts` | 17 юнит-тестов резолвера |
| `server/utils/subdomain.ts` | **шов** `provisionSubdomain()`/`unprovisionSubdomain()` (no-op заглушка) |
| `app/utils/shopUrl.ts` | единый `shopStorefrontUrl(slug)` (путь сейчас → субдомен при флаге) |
| `app/composables/useTenant.ts` | `tenantSlug` (пока всегда null) |
| `app/middleware/tenant.global.ts` | **безопасность:** на тенант-хосте отдаётся только витрина (dormant) |

**Правки (все dormant за флагом):** `shared/config/features.ts` (флаг), `app/pages/s/[slug]/index.vue` (slug с хоста + share-URL через хелпер), `app/pages/shop-admin/index.vue` (storefrontUrl через хелпер), `app/app.vue` (per-host canonical), `nuxt.config.ts` (cookie domain через env).

**Бонус (закрыта находка аудита):** разъезд fallback-хоста (`inkmade-pi.vercel.app` vs `inkmade.kz`) — теперь единый хелпер с фолбэком `inkmade.kz`.

---

## 4. ✅ F3: платформенный промокод больше не субсидирует магазины

**Было:** платформенный код считал скидку со всей корзины, включая товары магазинов, но `apply_paid` платит владельцу полную долю → платформа уходила в минус на «магазинной» корзине.
**Стало:** `server/api/orders/create.post.ts` — платформенный код скидывает только товары платформы (`platformSubtotal`); товары магазина скидываются только промокодом магазина.
**Риск сейчас:** нулевой — в проде 0 магазинов, смешанных корзин нет; утечка закрыта до запуска магазинов.

---

## 5. ✅ Снижено трение онбординга (дизайн → магазин в один клик)

| Файл | Изменение |
|---|---|
| `app/pages/account/designs.vue` | кнопка «Продать в магазине» на каждом дизайне (только владельцам) → `/shop-admin/items?design=<id>` |
| `app/pages/shop-admin/items.vue` | преселект дизайна из `?design=<id>` (только свой) |
| `i18n/locales/{ru,kk}/account.json` | `account.designs.sellInShop` |

---

## Деплой

1. Прогнать `npm run typecheck` и `npm test` локально (подтвердить `0` / `220`).
2. **Миграции для этого кода НЕ нужны** (всё — код/i18n/jsonb-поля).
3. Задеплоить (push). Флаги `subdomains`/`b2bGroupOrders`/`aiDesign` остаются `false`.
4. Ручной smoke (браузер) — см. ниже.

### Пост-деплой QA (ручной — авто-браузер в сессии был заблокирован)
- [ ] **Публикация товара:** конструктор → сохранить дизайн → `/shop-admin/items` → выбрать дизайн, цена>0, «активна» → сохраняется без ошибки guard; витрина `/s/<slug>` показывает товар; «в корзину» работает.
- [ ] **Шаблон:** `/shop-admin/branding` → выбрать шаблон → confirm → превью и поля обновились; логотип/контакты не затёрлись; «Сохранить» → витрина отражает.
- [ ] **Онбординг:** «Мои дизайны» → «Продать в магазине» → форма витрины с преселектом дизайна.
- [ ] **F3:** (после появления магазинов) смешанная корзина + платформенный промо → скидка только на товары платформы.
- [ ] Витрина: ссылка «powered by» и share-ссылка ведут на `inkmade.kz` (не на vercel-домен).

---

## Осталось (backlog с точными фиксами)

### F2 — кросс-namespace `used_count` (низкая важность; ⚠️ платёжное ядро)
В `apply_paid` (миграция 0081, стр. 67-69) платформенный `promo_codes.used_count` инкрементится по строке кода без проверки namespace. Если строка кода магазина совпадёт со строкой платформенного кода — у платформенного лишний `+1`. Триггерится редко (совпадение имён).
**Точный фикс** — в тот UPDATE добавить гард:
```sql
update public.promo_codes set used_count = used_count + 1
  where upper(code) = upper(v_order.promo_code)
    and (max_uses is null or used_count < max_uses)
    and not exists (                         -- ← ДОБАВИТЬ: не бампим платформенный код,
      select 1 from public.order_items oi    --   если у заказа есть магазинные line_discount
      where oi.order_id = p_order_id and oi.line_discount > 0
    );
```
**Как применять:** новая миграция `create or replace function apply_paid(...)` — тело **дословно** из 0081 + эта одна строка. `apply_paid` — критический платёжный RPC: сверить diff с 0081 построчно и прогнать на staging/в транзакции с откатом перед продом. Не отгружал в этой сессии сознательно (риск reproduction-ошибки в 140 строках платёжного ядра ради редкого edge).

### F4 — `material` без null-check в `shop_item_buy_payload` (косметика, без денежного эффекта)
Миграция 0070, `select * into m from materials ... ` без `if not found`. При отсутствии материала `printMethod` тихо станет null (терпимо downstream). Фикс — при желании добавить проверку в новой ревизии buy_payload.

### Субдомены — go-live после переезда с Vercel
1. `FEATURES.subdomains = true`
2. `NUXT_PUBLIC_COOKIE_DOMAIN=.inkmade.kz`
3. реализовать драйвер в `server/utils/subdomain.ts` (на своём сервере в РК — Caddy on-demand TLS + wildcard DNS `*.inkmade.kz`) и подключить к созданию магазина / кнопке «получить фирменный субдомен» (Вариант C: 1-клик апрув в `/admin/shops` против сквоттинга бренда)
4. рендер витрины на корне субдомена (`alma.inkmade.kz/` → витрина): route-rule/rewrite в Nitro (middleware уже пускает `/` и блокирует остальное)

### Выплаты магазинам — блокер #1 (реальный платёжный провайдер)
Доля копится на балансе, вывода нет. Зеркалить designer payouts после подключения провайдера.

### Память
Записи авто-памяти об этой сессии (блокер-фикс, шаблоны, субдомен-слой, F3, онбординг) заблокировал classifier — обновить `memory/b2b-shops-state.md` в новой сессии.

---

## Follow-up от тест-прогона (2026-07-19, через Supabase MCP на проде)

**Подтверждено на живом проде:**
- Создание магазина **РАБОТАЕТ**: `customer@inkmade.kz` завёл активный магазин `dmitriy` (18.07). `create_my_shop` проходит end-to-end.
- Подтверждение email на проекте **ВКЛЮЧЕНО**.

**Симптом «создал акк, но не переходит на /shop-admin» = стена подтверждения email, а НЕ баг флоу.** `useAuth.signUp` не создаёт сессию; при включённом подтверждении `register.vue` корректно показывает алерт «проверьте почту» без перехода на `?redirect`.

**Нужно проработать (решение владельца):**
1. **Email-подтверждение в self-serve воронке.** Либо выключить (Supabase Dashboard → Authentication → Providers → Email → `Confirm email = OFF`) ради гладкого входа регистрация → `/shop-new`, либо оставить и осознанно жить с трением. Сейчас включено → фактически блокирует нового владельца без клика по письму.
2. **Пост-подтверждение теряет людей.** Реальный self-signup `puriste1305@gmail.com` подтвердил почту, но `last_sign_in_at = null` — прошёл подтверждение и всё равно не вошёл. Проверить confirmation-redirect (устанавливается ли сессия, куда ведёт после клика), Redirect URLs и шаблон письма.
3. **Тестовые аккаунты с общим паролем в ПРОДЕ (security).** `admin@ / manager@ / designer@ / customer@ / company@ inkmade.kz` — пароль `Inkmade2026!`. Перед публичным запуском удалить или сменить пароли (особенно `manager@` = доступ к производству и `admin@`).
4. **Тестовые данные в проде — почистить перед запуском:** магазин `dmitriy` (customer@), мок-аккаунт `company@inkmade.kz` (заведён 2026-07-19 через MCP для проверки create-flow: подтверждён, роль customer, без магазина — удалить после проверки), сид-заказы.

---

## Каркас изменённых файлов (для ревью)
**Новые:** `shared/utils/tenant.ts`, `tests/tenant.test.ts`, `server/utils/subdomain.ts`, `app/utils/shopUrl.ts`, `app/composables/useTenant.ts`, `app/middleware/tenant.global.ts`, этот файл.
**Изменённые:** `shared/config/{features,shop-theme}.ts`, `nuxt.config.ts`, `app/app.vue`, `app/pages/customize/[id].vue`, `app/pages/s/[slug]/index.vue`, `app/pages/shop-admin/{index,branding,items}.vue`, `app/pages/account/designs.vue`, `app/composables/useGuestDesigns.ts`, `app/plugins/guest-import.client.ts`, `server/utils/schemas.ts`, `server/api/designs/import.post.ts`, `server/api/orders/create.post.ts`, `i18n/locales/{ru,kk}/{shopadmin,account}.json`.
