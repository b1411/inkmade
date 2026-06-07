-- INKMADE — миграция 0017: категории каталога как данные (§6)
-- Раньше список категорий был зашит в код (PRODUCT_CATEGORIES). Теперь — таблица,
-- чтобы админ добавлял/правил категории без кода. products.category хранит slug (FK).

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  icon        text,                                   -- имя lucide-иконки для плитки
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table categories enable row level security;

drop policy if exists categories_read on categories;
drop policy if exists categories_write_admin on categories;
-- публично видны активные; админ видит все (для управления)
create policy categories_read on categories for select
  using (is_active or private.is_admin());
create policy categories_write_admin on categories for all
  using (private.is_admin()) with check (private.is_admin());

-- стартовая категория
insert into categories (slug, title, icon, sort_order)
values ('textile', 'Текстиль', 'i-lucide-shirt', 1)
on conflict (slug) do nothing;

-- перенос существующих товаров на действующие категории (демо был 'trikotazh')
update products set category = 'textile'
where category not in (select slug from categories);

-- связь товара с категорией (нельзя удалить категорию с товарами)
alter table products drop constraint if exists products_category_fkey;
alter table products
  add constraint products_category_fkey
  foreign key (category) references categories (slug)
  on update cascade on delete restrict;
