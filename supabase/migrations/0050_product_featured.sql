-- Витринный флаг товара: какой товар показывать в Hero/Constructor/FinalCta на главной.
-- Раньше эти секции брали «первый попавшийся» активный товар без сортировки —
-- результат был недетерминированным. Теперь сортируем по is_featured (desc), и
-- отмеченный товар стабильно попадает в герой-блок.

alter table public.products
  add column if not exists is_featured boolean not null default false;

-- Только один товар-герой одновременно (частичный уникальный индекс).
create unique index if not exists products_single_featured_idx
  on public.products (is_featured)
  where is_featured;
