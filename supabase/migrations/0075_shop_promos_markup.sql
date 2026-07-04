-- 0075: промокоды магазина (shop-scoped) + наценка v2 (Фаза B5 «рост»).
--
-- НАЦЕНКА v2: shop_items.markup существует с 0066, но владелец её не задаёт (форма
-- правит только price). Делаем markup рабочей: покупатель платит price+markup (уже так),
-- владелец получает 100% markup + revenue_share_pct% от базы (price). Раньше доля
-- считалась как rate% от всей продажи; теперь markup целиком owner'у. Совместимо:
-- при markup=0 формула сводится к прежней round(unit_price*rate/100).
--
-- ПРОМОКОДЫ МАГАЗИНА: владелец заводит свои коды (в отличие от платформенных
-- public.promo_codes, которыми правит только админ). Скидка — расход ВЛАДЕЛЬЦА:
-- вычитается из его доли, база платформы (100-rate)% всегда защищена. Применение —
-- серверно при создании заказа (line_discount на позиции), учёт used_count — при оплате.
--
-- ВНИМАНИЕ: правится критичный платёжный RPC apply_paid — существующая логика (сток,
-- cogs, роялти, платформенное промо, finance) сохранена ДОСЛОВНО из 0068, изменён
-- только shop-блок начисления + добавлен инкремент shop_promo_codes. Аддитивно.

-- ── Снапшот наценки и скидки на позиции заказа (для авторитетного расчёта доли) ──
alter table public.order_items add column if not exists unit_markup   numeric(12, 2) not null default 0;
alter table public.order_items add column if not exists line_discount numeric(12, 2) not null default 0;

-- ── Промокоды магазина (зеркало public.promo_codes, но с владением по shop_id) ──
create table if not exists public.shop_promo_codes (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops (id) on delete cascade,
  code           text not null check (code ~ '^[A-Za-z0-9_-]{2,64}$'),
  discount_type  text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  min_order      numeric(12, 2) not null default 0 check (min_order >= 0),
  max_uses       integer check (max_uses is null or max_uses > 0),
  used_count     integer not null default 0,
  active         boolean not null default true,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
-- код уникален В ПРЕДЕЛАХ магазина (разные магазины могут иметь одинаковый код)
create unique index if not exists shop_promo_codes_shop_code_idx
  on public.shop_promo_codes (shop_id, upper(code));
create index if not exists shop_promo_codes_shop_idx on public.shop_promo_codes (shop_id);

alter table public.shop_promo_codes enable row level security;
-- владелец магазина (или админ) — полный CRUD своих кодов. Аноним валидирует через RPC.
create policy shop_promo_owner_all on public.shop_promo_codes for all
  using (exists (
    select 1 from public.shops s
    where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ))
  with check (exists (
    select 1 from public.shops s
    where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ));

-- ── Публичная валидация кода магазина (read-only, без побочных эффектов) ──
-- Возвращает {valid, code, discount, discount_type, discount_value} либо {valid:false}.
-- Скидка ограничена суммой заказа; НЕ инкрементит used_count (это при оплате).
-- Не отдаёт чужие/приватные поля. Магазин должен быть активен и публичен.
create or replace function public.shop_promo_validate(p_shop_id uuid, p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  pc public.shop_promo_codes;
  v_raw numeric(12, 2);
  v_disc numeric(12, 2);
begin
  if p_code is null or btrim(p_code) = '' or coalesce(p_subtotal, 0) <= 0 then
    return jsonb_build_object('valid', false);
  end if;
  -- магазин активен/публичен (не валидируем код скрытого магазина)
  if not exists (select 1 from public.shops s where s.id = p_shop_id and s.status = 'active' and s.is_public = true) then
    return jsonb_build_object('valid', false);
  end if;

  select * into pc from public.shop_promo_codes
    where shop_id = p_shop_id and upper(code) = upper(btrim(p_code)) limit 1;
  if not found then return jsonb_build_object('valid', false); end if;
  if not pc.active then return jsonb_build_object('valid', false); end if;
  if pc.expires_at is not null and pc.expires_at < now() then return jsonb_build_object('valid', false); end if;
  if pc.max_uses is not null and pc.used_count >= pc.max_uses then return jsonb_build_object('valid', false); end if;
  if p_subtotal < pc.min_order then return jsonb_build_object('valid', false); end if;

  v_raw := case when pc.discount_type = 'percent'
                then round(p_subtotal * pc.discount_value / 100, 2)
                else pc.discount_value end;
  v_disc := greatest(0, least(v_raw, p_subtotal));  -- не больше суммы
  if v_disc <= 0 then return jsonb_build_object('valid', false); end if;

  return jsonb_build_object(
    'valid', true,
    'code', pc.code,
    'discount', v_disc,
    'discount_type', pc.discount_type,
    'discount_value', pc.discount_value
  );
end;
$$;
revoke all on function public.shop_promo_validate(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.shop_promo_validate(uuid, text, numeric) to anon, authenticated;

-- ── apply_paid + наценка v2 и учёт скидки магазина (копия 0068, изменён shop-блок) ──
create or replace function public.apply_paid(p_order_id uuid, p_provider_txn text, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_order public.orders%rowtype;
  rec record;
  v_cogs numeric(12, 2) := 0;
  v_royalty_total numeric(12, 2) := 0;
  v_rate numeric(5, 2);
  v_base numeric(12, 2);
  v_roy numeric(12, 2);
  v_shop_rate numeric(5, 2);
  v_shop_base numeric(12, 2);
  v_shop_markup numeric(12, 2);
  v_shop_gross numeric(12, 2);
  v_shop_amt numeric(12, 2);
  v_shop_total numeric(12, 2) := 0;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;
  if v_order.paid_at is not null then return jsonb_build_object('already_paid', true); end if;

  if v_order.status not in ('created', 'pending') then
    raise exception 'Заказ в статусе % не может быть оплачен', v_order.status;
  end if;

  -- сверка суммы (anti-fraud): провайдерский amount обязан совпасть с суммой заказа
  if p_raw ? 'amount' and (p_raw ->> 'amount')::numeric is distinct from v_order.total then
    raise exception 'Сумма платежа % не совпадает с суммой заказа %', p_raw ->> 'amount', v_order.total
      using errcode = 'check_violation';
  end if;

  update public.orders
    set status = 'paid', paid_at = now(), payment_id = p_provider_txn,
        fiscal_receipt = jsonb_build_object(
          'status', 'pending_fiscalization', 'provider', 'mock', 'provider_txn', p_provider_txn,
          'amount', v_order.total, 'currency', v_order.currency, 'issued_at', now(),
          'note', 'Заглушка: фискализация ОФД РК (ККМ) не подключена'
        )
    where id = p_order_id;

  insert into public.payments (order_id, provider, provider_txn, amount, status, raw_payload)
    values (p_order_id, 'mock', p_provider_txn, v_order.total, 'success', p_raw);

  if v_order.promo_code is not null and v_order.discount > 0 then
    update public.promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code);
    -- промокод магазина: инкремент по коду в магазинах, чьи позиции получили скидку
    update public.shop_promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code)
        and shop_id in (
          select distinct oi.shop_id from public.order_items oi
          where oi.order_id = p_order_id and oi.shop_id is not null and oi.line_discount > 0
        );
  end if;

  for rec in select id, variant_id, quantity, unit_price, unit_cost, print_id, print_owner_id,
                    shop_id, unit_markup, line_discount
             from public.order_items where order_id = p_order_id loop
    if rec.variant_id is not null then
      update public.variants set stock = stock - rec.quantity
        where id = rec.variant_id and stock >= rec.quantity;
      if not found then
        raise exception 'Недостаточно остатка склада для варианта % (нужно %)',
          rec.variant_id, rec.quantity using errcode = 'check_violation';
      end if;
      insert into public.stock_movements (variant_id, delta, reason, order_id)
        values (rec.variant_id, -rec.quantity, 'order', p_order_id);
    end if;

    v_cogs := v_cogs + coalesce(rec.unit_cost, 0) * rec.quantity;

    if rec.print_owner_id is not null and rec.print_id is not null then
      select coalesce(dp.royalty_pct, pl.royalty_pct, 0) into v_rate
        from public.print_library pl
        left join public.designer_profiles dp on dp.id = rec.print_owner_id
        where pl.id = rec.print_id;
      v_base := rec.unit_price * rec.quantity;
      v_roy := round(v_base * coalesce(v_rate, 0) / 100, 2);
      v_royalty_total := v_royalty_total + v_roy;

      insert into public.royalty_earnings (designer_id, order_id, order_item_id, print_id, sale_base, rate_pct, amount, status)
        values (rec.print_owner_id, p_order_id, rec.id, rec.print_id, v_base, coalesce(v_rate, 0), v_roy, 'accrued');

      insert into public.designer_balances (designer_id, total_earned, available)
        values (rec.print_owner_id, v_roy, v_roy)
        on conflict (designer_id) do update
          set total_earned = public.designer_balances.total_earned + excluded.total_earned,
              available = public.designer_balances.available + excluded.available,
              updated_at = now();

      insert into public.finance_entries (entry_type, order_id, designer_id, amount, note)
        values ('royalty', p_order_id, rec.print_owner_id, v_roy, 'Роялти дизайнеру');
    end if;

    -- Доля B2B-магазина v2 (Фаза B5): владелец получает 100% своей наценки (unit_markup)
    -- + revenue_share_pct% от базы (unit_price − unit_markup), минус скидка своего
    -- промокода (line_discount). База платформы (100−rate)% всегда защищена.
    -- Совместимость: markup=0, line_discount=0 → round(unit_price*rate/100) как в 0068.
    if rec.shop_id is not null then
      select revenue_share_pct into v_shop_rate from public.shops where id = rec.shop_id;
      v_shop_markup := coalesce(rec.unit_markup, 0) * rec.quantity;
      v_shop_base := (rec.unit_price - coalesce(rec.unit_markup, 0)) * rec.quantity;
      v_shop_gross := v_shop_markup + round(v_shop_base * coalesce(v_shop_rate, 0) / 100, 2);
      v_shop_amt := greatest(0, v_shop_gross - coalesce(rec.line_discount, 0));
      if v_shop_amt > 0 then
        v_shop_total := v_shop_total + v_shop_amt;

        insert into public.shop_earnings (shop_id, order_id, order_item_id, sale_base, rate_pct, amount, status)
          values (rec.shop_id, p_order_id, rec.id, v_shop_base, coalesce(v_shop_rate, 0), v_shop_amt, 'accrued');

        insert into public.shop_balances (shop_id, total_earned, available)
          values (rec.shop_id, v_shop_amt, v_shop_amt)
          on conflict (shop_id) do update
            set total_earned = public.shop_balances.total_earned + excluded.total_earned,
                available = public.shop_balances.available + excluded.available,
                updated_at = now();

        insert into public.finance_entries (entry_type, order_id, amount, note)
          values ('shop_share', p_order_id, v_shop_amt, 'Доля B2B-магазина');
      end if;
    end if;
  end loop;

  insert into public.finance_entries (entry_type, order_id, amount, note)
    values ('revenue', p_order_id, v_order.total, 'Выручка заказа');
  if v_cogs > 0 then
    insert into public.finance_entries (entry_type, order_id, amount, note)
      values ('cogs', p_order_id, v_cogs, 'Себестоимость заготовок');
  end if;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'paid', null, 'Оплата подтверждена (webhook)');

  return jsonb_build_object('already_paid', false, 'royalty_total', v_royalty_total, 'shop_total', v_shop_total);
end;
$function$;
