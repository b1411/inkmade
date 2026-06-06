-- INKMADE — миграция 0005: усиление безопасности (паспорт §5.4, §10 инвариант 3)
-- Закрывает advisor WARN-и:
--  1) SECURITY DEFINER хелперы были вызываемы по REST (/rpc/*) ролями anon/authenticated
--     → переносим в схему private (PostgREST экспонирует только public), EXECUTE оставляем для RLS.
--  2) Публичный бакет catalog разрешал листинг файлов → убираем широкую SELECT-политику.

-- ── Приватная схема для хелперов (не видна в PostgREST API) ─────────
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.user_role(uid uuid default auth.uid())
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = uid;
$$;

create or replace function private.is_staff(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = uid) in ('operator', 'admin'), false);
$$;

create or replace function private.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = uid) = 'admin', false);
$$;

grant execute on function
  private.user_role(uuid), private.is_staff(uuid), private.is_admin(uuid)
  to anon, authenticated;

-- ── Триггер профиля → private ──────────────────────────────────────
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Пересоздаём политики, ссылавшиеся на public-хелперы → private ───
-- products
drop policy products_read_public on products;
drop policy products_write_admin on products;
create policy products_read_public on products for select
  using (is_active or private.is_admin());
create policy products_write_admin on products for all
  using (private.is_admin()) with check (private.is_admin());

-- materials
drop policy materials_read on materials;
drop policy materials_write_admin on materials;
create policy materials_read on materials for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or private.is_admin())));
create policy materials_write_admin on materials for all
  using (private.is_admin()) with check (private.is_admin());

-- print_zones
drop policy print_zones_read on print_zones;
drop policy print_zones_write_admin on print_zones;
create policy print_zones_read on print_zones for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or private.is_admin())));
create policy print_zones_write_admin on print_zones for all
  using (private.is_admin()) with check (private.is_admin());

-- variants
drop policy variants_read on variants;
drop policy variants_write_admin on variants;
create policy variants_read on variants for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or private.is_admin())));
create policy variants_write_admin on variants for all
  using (private.is_admin()) with check (private.is_admin());

-- product_images
drop policy product_images_read on product_images;
drop policy product_images_write_admin on product_images;
create policy product_images_read on product_images for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_active or private.is_admin())));
create policy product_images_write_admin on product_images for all
  using (private.is_admin()) with check (private.is_admin());

-- print_library
drop policy print_library_read on print_library;
drop policy print_library_write_admin on print_library;
create policy print_library_read on print_library for select
  using (is_active or private.is_admin());
create policy print_library_write_admin on print_library for all
  using (private.is_admin()) with check (private.is_admin());

-- profiles
drop policy profiles_read on profiles;
drop policy profiles_update_self on profiles;
drop policy profiles_admin_all on profiles;
create policy profiles_read on profiles for select
  using (id = auth.uid() or private.is_admin());
create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = private.user_role());
create policy profiles_admin_all on profiles for all
  using (private.is_admin()) with check (private.is_admin());

-- designs
drop policy designs_staff_read on designs;
create policy designs_staff_read on designs for select
  using (
    private.is_admin()
    or (private.is_staff() and exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.design_id = designs.id and o.paid_at is not null
    ))
  );

-- orders
drop policy orders_staff_read on orders;
drop policy orders_staff_update on orders;
create policy orders_staff_read on orders for select
  using (private.is_admin() or (private.is_staff() and paid_at is not null));
create policy orders_staff_update on orders for update
  using (private.is_staff()) with check (private.is_staff());

-- order_items
drop policy order_items_staff_read on order_items;
create policy order_items_staff_read on order_items for select
  using (private.is_admin() or (private.is_staff() and exists (
    select 1 from orders o where o.id = order_id and o.paid_at is not null)));

-- payments
drop policy payments_staff_read on payments;
create policy payments_staff_read on payments for select
  using (private.is_staff());

-- order_status_log
drop policy status_log_staff_read on order_status_log;
drop policy status_log_staff_insert on order_status_log;
create policy status_log_staff_read on order_status_log for select
  using (private.is_staff());
create policy status_log_staff_insert on order_status_log for insert
  with check (private.is_staff());

-- stock_movements
drop policy stock_staff_read on stock_movements;
drop policy stock_staff_write on stock_movements;
create policy stock_staff_read on stock_movements for select
  using (private.is_staff());
create policy stock_staff_write on stock_movements for all
  using (private.is_staff()) with check (private.is_staff());

-- storage.objects
drop policy catalog_read_public on storage.objects;       -- публичный бакет отдаёт по public URL без листинга
drop policy catalog_write_admin on storage.objects;
drop policy catalog_update_admin on storage.objects;
drop policy catalog_delete_admin on storage.objects;
drop policy designs_obj_owner_read on storage.objects;
drop policy designs_obj_owner_update on storage.objects;
drop policy designs_obj_owner_delete on storage.objects;
create policy catalog_write_admin on storage.objects for insert
  with check (bucket_id = 'catalog' and private.is_admin());
create policy catalog_update_admin on storage.objects for update
  using (bucket_id = 'catalog' and private.is_admin());
create policy catalog_delete_admin on storage.objects for delete
  using (bucket_id = 'catalog' and private.is_admin());
create policy designs_obj_owner_read on storage.objects for select
  using (bucket_id = 'designs' and (owner = auth.uid() or private.is_staff()));
create policy designs_obj_owner_update on storage.objects for update
  using (bucket_id = 'designs' and (owner = auth.uid() or private.is_admin()));
create policy designs_obj_owner_delete on storage.objects for delete
  using (bucket_id = 'designs' and (owner = auth.uid() or private.is_admin()));

-- ── Удаляем публичные хелперы (зависимостей в политиках больше нет) ─
drop function if exists public.user_role(uuid);
drop function if exists public.is_staff(uuid);
drop function if exists public.is_admin(uuid);
drop function if exists public.handle_new_user();
