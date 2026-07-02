-- 0068: деньги B2B-магазина v1 (Фаза B4) — начисление доли магазина при оплате.
-- Модель: розничную цену ставит владелец (shop_items.price); магазин получает
-- revenue_share_pct% от продажи (unit_price×qty), платформа — остальное. Начисление
-- в apply_paid по order_items.shop_id (параллельно роялти дизайнеру). Аддитивно.
-- ВНИМАНИЕ: изменяется критичный платёжный RPC apply_paid — существующая логика
-- (сток, cogs, роялти, промо, finance) сохранена дословно, добавлен только shop-блок.

-- ── Начисления и баланс магазина (зеркало royalty_earnings/designer_balances) ──
create table if not exists public.shop_earnings (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  order_id      uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  sale_base     numeric(12, 2) not null,
  rate_pct      numeric(5, 2) not null,
  amount        numeric(12, 2) not null,
  status        text not null default 'accrued' check (status in ('accrued', 'paid')),
  payout_id     uuid,
  created_at    timestamptz not null default now()
);
create index if not exists shop_earnings_shop_idx on public.shop_earnings (shop_id, created_at desc);
create index if not exists shop_earnings_order_idx on public.shop_earnings (order_id);

create table if not exists public.shop_balances (
  shop_id      uuid primary key references public.shops (id) on delete cascade,
  total_earned numeric(12, 2) not null default 0,
  total_paid   numeric(12, 2) not null default 0,
  available    numeric(12, 2) not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.shop_earnings enable row level security;
alter table public.shop_balances enable row level security;
-- владелец видит начисления/баланс своего магазина; админ — все. Пишет только apply_paid (definer).
create policy shop_earnings_read on public.shop_earnings for select
  using (exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())));
create policy shop_balances_read on public.shop_balances for select
  using (exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())));

-- ── Расширяем типы финансовых проводок: доля магазина ──
do $$
declare c text;
begin
  select conname into c from pg_constraint
    where conrelid = 'public.finance_entries'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%entry_type%' limit 1;
  if c is not null then execute 'alter table public.finance_entries drop constraint ' || quote_ident(c); end if;
end $$;
alter table public.finance_entries add constraint finance_entries_entry_type_check
  check (entry_type in ('revenue', 'cogs', 'royalty', 'acquiring_fee', 'shipping', 'refund', 'other', 'shop_share'));

-- ── apply_paid + начисление доли магазина по order_items.shop_id ──
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
  end if;

  for rec in select id, variant_id, quantity, unit_price, unit_cost, print_id, print_owner_id, shop_id
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

    -- Доля B2B-магазина: revenue_share_pct% от продажи позиции (Фаза B4).
    if rec.shop_id is not null then
      select revenue_share_pct into v_shop_rate from public.shops where id = rec.shop_id;
      v_shop_base := rec.unit_price * rec.quantity;
      v_shop_amt := round(v_shop_base * coalesce(v_shop_rate, 0) / 100, 2);
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
