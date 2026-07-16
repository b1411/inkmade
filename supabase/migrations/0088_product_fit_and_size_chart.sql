-- 0088 — посадка и размерная сетка товара (спека §42).
--
-- ЗАЧЕМ. §42.1 требует на карточке товара: рост модели, размер на модели, обхват
-- груди модели, fit label, рекомендацию размера, точные замеры изделия, состав,
-- плотность, уход, заметку об усадке. В схеме нет НИ ОДНОГО из этих полей:
--   products  — title, category, base_price, max_size_label, max_print_mm, description
--   materials — name, fabric_type, print_method, print_mode, surcharge
--   variants  — color, size, stock, sku, blank_cost
--
-- Из-за этого размерная сетка была захардкожена одна на все товары и врала: кепке
-- с единственным размером OS сообщала «обхват груди 92–96», оверсайзу предлагала
-- XXL, которого нет в продаже, а классике и оверсайзу давала ОДИНАКОВЫЕ замеры —
-- при том что §42.2 требует их сравнивать именно потому, что они разные.
-- Компонент уже перестал врать (показывает только проданные размеры), но настоящие
-- числа взять неоткуда. Эти две колонки — то место, куда их положить.
--
-- ПОЧЕМУ JSONB, А НЕ ТАБЛИЦЫ. size_chart — это документ на товар: он всегда читается
-- целиком вместе с товаром, никогда не джойнится и не фильтруется по отдельной мерке.
-- Отдельная таблица дала бы join ради данных, которые живут и умирают с товаром.
-- fit — тем более: набор полей editorial-природы, который будет дополняться.
--
-- Обе колонки nullable: пока пусты, карточка показывает то же, что сегодня.
-- Заполнять — человеку с реальными мерками от производства (§25 напоминает, что
-- цифры подтверждает производство). Выдуманные замеры стоят возвратов.

alter table public.products
  add column if not exists fit jsonb,
  add column if not exists size_chart jsonb;

comment on column public.products.fit is
  'Посадка и характеристики (§42.1). {"label":"Свободная oversize","recommendation":"...","model":{"heightCm":182,"wornSize":"L","chestCm":96},"composition":"100% хлопок","densityGsm":240,"care":"...","shrinkage":"..."}. NULL = блок посадки на карточке скрыт.';

comment on column public.products.size_chart is
  'Точные замеры изделия по размерам (§42.1), см. [{"size":"S","chestCm":56,"lengthCm":70,"shoulderCm":56,"sleeveCm":22}]. NULL = размерная сетка падает на ориентировочную с оговоркой. Размеры обязаны совпадать с variants.size.';

-- ── Валидатор size_chart ─────────────────────────────────────────────────────
-- Функция, а не выражение в CHECK: проверить КАЖДЫЙ элемент массива нужен
-- jsonb_array_elements, а подзапросы в CHECK Postgres запрещает.
--
-- coalesce(..., false) снаружи bool_and — не перестраховка: bool_and по пустому
-- множеству возвращает NULL, а CHECK пропускает всё, что не FALSE. Без coalesce
-- пустой массив прошёл бы насквозь. На этой же ловушке (jsonb_typeof отсутствующего
-- ключа → NULL → сравнение → NULL → CHECK доволен) уже прокололась миграция 0087.
--
-- Форма `coalesce(jsonb_typeof(...), 'null') in ('null','number')` вместо привычного
-- `... is null or ...` — потому что у jsonb ДВА разных «ничего»: отсутствующий ключ
-- даёт SQL NULL, а явный `"chestCm": null` даёт jsonb 'null'. Оба обязаны считаться
-- «мерки нет», иначе админка, присылающая полный объект с null-ами, упёрлась бы в
-- constraint на ровном месте. Проверено на 23 случаях, включая оба вида null.
create or replace function public.is_valid_size_chart(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v is null or (
    jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) > 0
    and coalesce((
      select bool_and(
        jsonb_typeof(e) = 'object'
        -- размер обязателен и непустой: строка сетки без размера бесполезна
        and coalesce(jsonb_typeof(e -> 'size'), '') = 'string'
        and length(btrim(e ->> 'size')) > 0
        -- мерки необязательны; если заданы — только положительные числа
        and (coalesce(jsonb_typeof(e -> 'chestCm'), 'null')    in ('null', 'number'))
        and (coalesce(jsonb_typeof(e -> 'lengthCm'), 'null')   in ('null', 'number'))
        and (coalesce(jsonb_typeof(e -> 'shoulderCm'), 'null') in ('null', 'number'))
        and (coalesce(jsonb_typeof(e -> 'sleeveCm'), 'null')   in ('null', 'number'))
        and (jsonb_typeof(e -> 'chestCm')    is distinct from 'number' or (e ->> 'chestCm')::numeric    > 0)
        and (jsonb_typeof(e -> 'lengthCm')   is distinct from 'number' or (e ->> 'lengthCm')::numeric   > 0)
        and (jsonb_typeof(e -> 'shoulderCm') is distinct from 'number' or (e ->> 'shoulderCm')::numeric > 0)
        and (jsonb_typeof(e -> 'sleeveCm')   is distinct from 'number' or (e ->> 'sleeveCm')::numeric   > 0)
      )
      from jsonb_array_elements(v) e
    ), false)
  );
$$;

comment on function public.is_valid_size_chart(jsonb) is
  'Проверка формы products.size_chart (миграция 0088). Чистый предикат без доступа к данным.';

alter table public.products
  drop constraint if exists products_size_chart_shape;

alter table public.products
  add constraint products_size_chart_shape check (public.is_valid_size_chart(size_chart));

-- ── Валидатор fit ────────────────────────────────────────────────────────────
-- Мягкий намеренно: fit — редакционный блок, поля будут дополняться, и жёсткая
-- схема тут превратится в тормоз. Стережём только то, что ломает вывод молча:
-- тип контейнера, числа там, где ожидаются числа, и вложенный model-объект.
alter table public.products
  drop constraint if exists products_fit_shape;

alter table public.products
  add constraint products_fit_shape check (
    fit is null or (
      jsonb_typeof(fit) = 'object'
      and coalesce(jsonb_typeof(fit -> 'model'), 'null') in ('null', 'object')
      and coalesce(jsonb_typeof(fit -> 'densityGsm'), 'null') in ('null', 'number')
      and (jsonb_typeof(fit -> 'densityGsm') is distinct from 'number' or (fit ->> 'densityGsm')::numeric > 0)
      and coalesce(jsonb_typeof(fit #> '{model,heightCm}'), 'null') in ('null', 'number')
      and (jsonb_typeof(fit #> '{model,heightCm}') is distinct from 'number' or (fit #>> '{model,heightCm}')::numeric > 0)
      and coalesce(jsonb_typeof(fit #> '{model,chestCm}'), 'null') in ('null', 'number')
      and (jsonb_typeof(fit #> '{model,chestCm}') is distinct from 'number' or (fit #>> '{model,chestCm}')::numeric > 0)
      and coalesce(jsonb_typeof(fit #> '{model,wornSize}'), 'null') in ('null', 'string')
    )
  );

