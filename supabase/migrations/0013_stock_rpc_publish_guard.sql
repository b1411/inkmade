-- INKMADE — миграция 0013: атомарный склад + защита публикации (аудит H5/H6)

-- H5: ручная корректировка склада атомарно (движение + остаток в одной транзакции).
-- SECURITY DEFINER + проверка роли внутри (вызов клиентом под auth, не service_role).
create or replace function public.adjust_stock(
  p_variant_id uuid, p_delta integer, p_reason text
) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_stock integer;
begin
  if not private.is_staff() then raise exception 'Недостаточно прав'; end if;
  if p_reason not in ('purchase', 'correction', 'defect') then
    raise exception 'Недопустимая причина движения';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_variant_id::text));
  insert into public.stock_movements (variant_id, delta, reason, actor_id)
    values (p_variant_id, p_delta, p_reason, auth.uid());
  update public.variants set stock = greatest(0, stock + p_delta)
    where id = p_variant_id returning stock into v_stock;
  return v_stock;
end;
$$;

revoke all on function public.adjust_stock(uuid, integer, text) from public, anon;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;

-- H6: нельзя опубликовать товар без зон печати, фото и вариантов (§8.2.1).
-- Раньше проверка была только на клиенте — admin обходил прямым запросом.
create or replace function public.enforce_publish_requirements()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not coalesce(old.is_active, false)) then
    if not exists (select 1 from public.print_zones where product_id = new.id) then
      raise exception 'Нельзя опубликовать: не заданы зоны печати';
    end if;
    if not exists (select 1 from public.product_images where product_id = new.id) then
      raise exception 'Нельзя опубликовать: нет фото товара';
    end if;
    if not exists (select 1 from public.variants where product_id = new.id) then
      raise exception 'Нельзя опубликовать: нет вариантов (цвет × размер)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_publish on public.products;
create trigger trg_enforce_publish before insert or update on public.products
  for each row execute function public.enforce_publish_requirements();
