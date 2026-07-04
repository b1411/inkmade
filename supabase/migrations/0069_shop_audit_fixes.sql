-- 0069: аудит-фиксы B2B-магазинов (claim-флоу владельца + целостность + анти-обход).
-- Аддитивно, идемпотентно. Правит критичный admin_create_shop — прежняя логика создания
-- магазина сохранена, добавлены: claim-токен (F1), guard заявки (F5). Плюс триггер
-- целостности shop_items (F2/F3) и колонка кода закрытого магазина в корзине (F4).

-- ── F1: claim-флоу владельца (зеркало designer-invitations 0032/0047) ────────
-- admin_create_shop резолвит owner по email заявки. Если заявитель ещё НЕ
-- зарегистрирован на момент одобрения (обычный случай — форма публичная), owner_id
-- оставался null и привязать владельца было НЕЧЕМ → /shop-admin его не пускал.
-- Теперь при отсутствии owner создаётся claim_token (bound к email заявки); владелец
-- логинится тем же email и активирует владение через RPC claim_shop(token).
alter table public.shops add column if not exists claim_token text unique;
alter table public.shops add column if not exists claim_email text;

-- Иммутабельность slug/owner/status/revenue_share/application для НЕ-админа.
-- ИЗМЕНЕНИЕ: первичная привязка owner (null → uid) РАЗРЕШЕНА — это claim владельцем.
-- Прямой PostgREST-UPDATE строки с owner_id=null для не-админа отсекается RLS
-- (shops_owner_update USING owner_id=auth.uid()), поэтому null→uid делает только
-- claim_shop (SECURITY DEFINER, в обход RLS). Переназначение owner→other по-прежнему
-- запрещено (old.owner_id is not null).
create or replace function public.guard_shops_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    if new.slug is distinct from old.slug
       or (new.owner_id is distinct from old.owner_id and old.owner_id is not null)
       or new.status is distinct from old.status
       or new.revenue_share_pct is distinct from old.revenue_share_pct
       or new.application_id is distinct from old.application_id then
      raise exception 'slug/owner/status/revenue_share магазина меняет только админ';
    end if;
  end if;
  return new;
end;
$$;

-- admin_create_shop v2: F5-guard (заявка pending и ещё не связана с магазином) +
-- claim_token при отсутствии зарегистрированного owner. Возвращает claim_token/owner_id,
-- чтобы админ дал владельцу claim-ссылку /shop-claim/<token>.
create or replace function public.admin_create_shop(
  p_app_id uuid, p_slug text, p_name text, p_revenue_share numeric default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.shop_applications;
  v_slug text := lower(trim(p_slug));
  v_owner uuid;
  v_id uuid;
  v_claim text;
begin
  if not private.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into a from public.shop_applications where id = p_app_id;
  if not found then
    raise exception 'заявка не найдена';
  end if;
  -- F5: не создавать дубль-магазин по уже разобранной/связанной заявке
  if a.status <> 'pending' then
    raise exception 'заявка уже разобрана';
  end if;
  if exists (select 1 from public.shops where application_id = a.id) then
    raise exception 'магазин по этой заявке уже создан';
  end if;
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'некорректный slug';
  end if;
  if public.is_reserved_shop_slug(v_slug) then
    raise exception 'slug зарезервирован';
  end if;
  if exists (select 1 from public.shops where slug = v_slug) then
    raise exception 'slug занят';
  end if;

  select id into v_owner from auth.users where lower(email) = lower(a.email) limit 1;
  -- владелец ещё не зарегистрирован → выдаём claim-токен, привязанный к email заявки
  if v_owner is null then
    v_claim := replace(gen_random_uuid()::text, '-', '');
  end if;

  insert into public.shops (slug, name, owner_id, application_id, revenue_share_pct, contacts, claim_token, claim_email)
  values (
    v_slug, coalesce(nullif(trim(p_name), ''), a.org_name), v_owner, a.id,
    coalesce(p_revenue_share, 0),
    jsonb_build_object('phone', a.phone),
    v_claim, lower(a.email)
  )
  returning id into v_id;

  update public.shop_applications
    set status = 'approved', resolved_at = now(), resolved_by = (select auth.uid())
    where id = p_app_id and status = 'pending';

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'claim_token', v_claim, 'owner_id', v_owner);
end;
$$;
revoke all on function public.admin_create_shop(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.admin_create_shop(uuid, text, text, numeric) to authenticated;

-- claim_shop(token): владелец с совпадающим email становится shops.owner_id.
-- SECURITY DEFINER — обходит RLS (строку с owner_id=null не видит никто, кроме админа)
-- и guard (первичный null→uid разрешён). Защита от утёкшей ссылки — совпадение email.
create or replace function public.claim_shop(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.shops;
  v_uid uuid := auth.uid();
  v_email text := auth.email();
begin
  if v_uid is null then raise exception 'Требуется вход'; end if;

  select * into s from public.shops where claim_token = p_token;
  if not found then raise exception 'Ссылка недействительна'; end if;
  if s.owner_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;
  if v_email is null or s.claim_email is null or lower(v_email) <> lower(s.claim_email) then
    raise exception 'Ссылка оформлена на другой email';
  end if;

  update public.shops
    set owner_id = v_uid, claim_token = null
    where id = s.id;

  return jsonb_build_object('ok', true, 'slug', s.slug);
end;
$$;
revoke all on function public.claim_shop(text) from public, anon;
grant execute on function public.claim_shop(text) to authenticated;

-- ── F2 + F3: целостность позиций витрины (триггер) ──────────────────────────
-- F3: design_id позиции обязан принадлежать владельцу магазина. RLS shop_items
-- проверяет только владение магазином, а вставка идёт напрямую через PostgREST —
-- значит владелец мог указать ЧУЖОЙ design_id, а buy_payload (definer) прочитал бы
-- его в обход RLS (продажа чужой композиции). Теперь — запрет.
-- F2: активная позиция обязана иметь цену > 0 (price+markup). Иначе витрина показывает
-- «0 ₸», «в корзину» срабатывает, но orders/create отклоняет заказ на оплате (тупик).
create or replace function public.guard_shop_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_design_owner uuid;
begin
  if new.design_id is not null then
    select owner_id into v_owner from public.shops where id = new.shop_id;
    select user_id into v_design_owner from public.designs where id = new.design_id;
    if v_owner is null or v_design_owner is null or v_design_owner <> v_owner then
      raise exception 'Публиковать можно только собственные дизайны';
    end if;
  end if;

  if new.is_active and coalesce(new.price, 0) + coalesce(new.markup, 0) <= 0 then
    raise exception 'У активной позиции цена должна быть больше 0';
  end if;

  return new;
end;
$$;
revoke all on function public.guard_shop_item() from public, anon, authenticated;
drop trigger if exists trg_guard_shop_item on public.shop_items;
create trigger trg_guard_shop_item before insert or update on public.shop_items
  for each row execute function public.guard_shop_item();

-- ── F4: код закрытого магазина в корзине (для проверки на оформлении заказа) ──
-- shop_item_buy_payload требует access_code, но orders/create проверял только
-- status/is_active — код можно было обойти прямым POST с известным shop_item_id.
-- Кладём код рядом с позицией; сервер сверяет его при создании заказа (в хендлере).
alter table public.cart_items
  add column if not exists shop_access_code text;
