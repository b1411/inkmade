-- INKMADE — миграция 0004: RLS-политики и Storage (паспорт §5.4, §10 инвариант 3)
-- Ошибка здесь = утечка чужих дизайнов/заказов или повышение роли. Проверять до релиза.

-- ── Helper: роль текущего пользователя (security definer обходит RLS,
--    чтобы политики на profiles не уходили в рекурсию) ───────────────
create or replace function public.user_role(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = uid;
$$;

create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = uid) in ('operator', 'admin'), false);
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = uid) = 'admin', false);
$$;

-- ── Включаем RLS на всех таблицах ──────────────────────────────────
alter table products        enable row level security;
alter table materials       enable row level security;
alter table print_zones     enable row level security;
alter table variants        enable row level security;
alter table product_images  enable row level security;
alter table print_library   enable row level security;
alter table designs         enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table payments        enable row level security;
alter table profiles        enable row level security;
alter table order_status_log enable row level security;
alter table stock_movements enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- КАТАЛОГ: публичное чтение опубликованного, запись только admin (§5.4)
-- ════════════════════════════════════════════════════════════════════

create policy products_read_public on products for select
  using (is_active or public.is_admin());
create policy products_write_admin on products for all
  using (public.is_admin()) with check (public.is_admin());

-- materials/print_zones/variants/product_images публичны, если их товар активен
create policy materials_read on materials for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy materials_write_admin on materials for all
  using (public.is_admin()) with check (public.is_admin());

create policy print_zones_read on print_zones for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy print_zones_write_admin on print_zones for all
  using (public.is_admin()) with check (public.is_admin());

create policy variants_read on variants for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy variants_write_admin on variants for all
  using (public.is_admin()) with check (public.is_admin());

create policy product_images_read on product_images for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy product_images_write_admin on product_images for all
  using (public.is_admin()) with check (public.is_admin());

create policy print_library_read on print_library for select
  using (is_active or public.is_admin());
create policy print_library_write_admin on print_library for all
  using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- PROFILES: self read/update; роль меняет только admin (§5.4)
-- ════════════════════════════════════════════════════════════════════

create policy profiles_read on profiles for select
  using (id = auth.uid() or public.is_admin());

-- self-update без смены роли (роль обязана остаться прежней)
create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.user_role());

-- admin может всё (включая смену роли)
create policy profiles_admin_all on profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- DESIGNS: клиент — только свои; staff — связанные с оплаченными заказами
-- ════════════════════════════════════════════════════════════════════

create policy designs_owner_all on designs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy designs_staff_read on designs for select
  using (
    public.is_admin()
    or (public.is_staff() and exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.design_id = designs.id and o.paid_at is not null
    ))
  );

-- ════════════════════════════════════════════════════════════════════
-- ORDERS: клиент — свои; admin — все; operator — оплаченные (§5.4)
-- ════════════════════════════════════════════════════════════════════

create policy orders_owner_read on orders for select
  using (user_id = auth.uid());
create policy orders_staff_read on orders for select
  using (public.is_admin() or (public.is_staff() and paid_at is not null));

-- клиент создаёт только неоплаченный заказ (created/pending); paid ставит webhook (§10)
create policy orders_owner_insert on orders for insert
  with check (user_id = auth.uid() and status in ('created', 'pending'));

-- смену статуса делает staff через server/api с валидацией автомата (§8.5)
create policy orders_staff_update on orders for update
  using (public.is_staff()) with check (public.is_staff());

-- ════════════════════════════════════════════════════════════════════
-- ORDER_ITEMS: наследуют доступ заказа
-- ════════════════════════════════════════════════════════════════════

create policy order_items_owner_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy order_items_staff_read on order_items for select
  using (public.is_admin() or (public.is_staff() and exists (
    select 1 from orders o where o.id = order_id and o.paid_at is not null)));
create policy order_items_owner_insert on order_items for insert
  with check (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════════
-- PAYMENTS: чтение staff; запись — только сервис (service role обходит RLS)
-- ════════════════════════════════════════════════════════════════════

create policy payments_staff_read on payments for select
  using (public.is_staff());

-- ════════════════════════════════════════════════════════════════════
-- ЛОГ СТАТУСОВ и СКЛАД: только staff (§5.4). Клиенту — через эндпоинт.
-- ════════════════════════════════════════════════════════════════════

create policy status_log_staff_read on order_status_log for select
  using (public.is_staff());
create policy status_log_staff_insert on order_status_log for insert
  with check (public.is_staff());

create policy stock_staff_read on stock_movements for select
  using (public.is_staff());
create policy stock_staff_write on stock_movements for all
  using (public.is_staff()) with check (public.is_staff());

-- ════════════════════════════════════════════════════════════════════
-- STORAGE: бакет каталога (public read) и приватный бакет дизайнов
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('designs', 'designs', false)
on conflict (id) do nothing;

-- catalog: публичное чтение, запись только admin
create policy catalog_read_public on storage.objects for select
  using (bucket_id = 'catalog');
create policy catalog_write_admin on storage.objects for insert
  with check (bucket_id = 'catalog' and public.is_admin());
create policy catalog_update_admin on storage.objects for update
  using (bucket_id = 'catalog' and public.is_admin());
create policy catalog_delete_admin on storage.objects for delete
  using (bucket_id = 'catalog' and public.is_admin());

-- designs: приватный. Владелец грузит/читает свои; staff читает; доступ клиенту — по подписанным URL
create policy designs_obj_owner_read on storage.objects for select
  using (bucket_id = 'designs' and (owner = auth.uid() or public.is_staff()));
create policy designs_obj_owner_insert on storage.objects for insert
  with check (bucket_id = 'designs' and owner = auth.uid());
create policy designs_obj_owner_update on storage.objects for update
  using (bucket_id = 'designs' and (owner = auth.uid() or public.is_admin()));
create policy designs_obj_owner_delete on storage.objects for delete
  using (bucket_id = 'designs' and (owner = auth.uid() or public.is_admin()));
