-- 0057: закрытие находок аудита безопасности (RLS + платежи), 2026-06-30.
-- Пять независимых блоков, каждый идемпотентен (create or replace / if not exists / drop-before-create):
--   1) orders   — гард иммутабельных полей при ПРЯМОМ клиентском UPDATE (operator не правит деньги/статус).
--   2) payments — apply_paid v6: сверка суммы платежа + unique provider_txn (anti-replay/учёт).
--   3) designer_profiles — публичная витрина больше не отдаёт payout_details/tax_status (вьюха-проекция).
--   4) print_library — дизайнер не может завысить себе royalty_pct / сменить owner_id (гард-триггер).
--   5) platform_settings — ключи приватны по умолчанию (anon видит только is_public).

-- ════════════════════════════════════════════════════════════════════
-- 1. ORDERS: иммутабельные денежные/статусные поля при клиентском UPDATE
-- ════════════════════════════════════════════════════════════════════
-- Политика orders_staff_update (0005) разрешает любому operator прямой PATCH любой
-- колонки заказа через PostgREST в обход серверного автомата (change_order_status) и
-- идемпотентности оплаты (apply_paid): можно выставить paid_at/status='paid' без платежа,
-- переписать total/user_id/discount. Сужаем НЕ политику (чтобы не сломать правку
-- производственных полей), а гард-триггером: service_role (серверные RPC) имеет
-- auth.uid() IS NULL и проходит; прямой клиентский UPDATE (operator/admin через REST)
-- не вправе менять денежные/статусные/владельческие поля.
create or replace function public.guard_orders_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if new.total          is distinct from old.total
       or new.discount    is distinct from old.discount
       or new.status      is distinct from old.status
       or new.paid_at     is distinct from old.paid_at
       or new.payment_id  is distinct from old.payment_id
       or new.user_id     is distinct from old.user_id
       or new.promo_code  is distinct from old.promo_code
       or new.currency    is distinct from old.currency
       or new.fiscal_receipt is distinct from old.fiscal_receipt then
      raise exception 'Денежные/статусные поля заказа меняются только серверным RPC';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_orders_update() from public, anon, authenticated;
drop trigger if exists trg_guard_orders_update on public.orders;
create trigger trg_guard_orders_update before update on public.orders
  for each row execute function public.guard_orders_update();

-- ════════════════════════════════════════════════════════════════════
-- 2. PAYMENTS: сверка суммы + уникальность транзакции провайдера
-- ════════════════════════════════════════════════════════════════════
-- anti-replay/учёт на уровне БД: один платёж провайдера не засчитается дважды/двум заказам.
-- Частичный индекс (provider_txn not null) — мок/реальный провайдер всегда отдают txn.
create unique index if not exists payments_provider_txn_uniq
  on public.payments (provider, provider_txn) where provider_txn is not null;

-- apply_paid v6 = тело v5 (0055) + сверка суммы. Если провайдер прислал amount в payload,
-- он ОБЯЗАН совпасть с orders.total — иначе «оплати 1 ₸ → заказ paid» при реальном шлюзе.
-- mock-confirm теперь кладёт amount в подписанный payload, так что путь проверяется в dev.
create or replace function public.apply_paid(
  p_order_id uuid, p_provider_txn text, p_raw jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  rec record;
  v_cogs numeric(12, 2) := 0;
  v_royalty_total numeric(12, 2) := 0;
  v_rate numeric(5, 2);
  v_base numeric(12, 2);
  v_roy numeric(12, 2);
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;
  if v_order.paid_at is not null then return jsonb_build_object('already_paid', true); end if;

  -- guard состояния: оплачивать можно только заказ, не покинувший пред-оплатные статусы
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

  -- учёт промокода ТОЛЬКО при оплате (см. 0055). Идемпотентно: apply_paid один раз на заказ.
  if v_order.promo_code is not null and v_order.discount > 0 then
    update public.promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code);
  end if;

  -- по каждой позиции: списание склада + себестоимость + роялти (если принт дизайнера)
  for rec in select id, variant_id, quantity, unit_price, unit_cost, print_id, print_owner_id
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
  end loop;

  insert into public.finance_entries (entry_type, order_id, amount, note)
    values ('revenue', p_order_id, v_order.total, 'Выручка заказа');
  if v_cogs > 0 then
    insert into public.finance_entries (entry_type, order_id, amount, note)
      values ('cogs', p_order_id, v_cogs, 'Себестоимость заготовок');
  end if;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'paid', null, 'Оплата подтверждена (webhook)');

  return jsonb_build_object('already_paid', false, 'royalty_total', v_royalty_total);
end;
$$;

revoke all on function public.apply_paid(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_paid(uuid, text, jsonb) to service_role;

-- ════════════════════════════════════════════════════════════════════
-- 3. DESIGNER_PROFILES: публичная витрина без payout_details/tax_status
-- ════════════════════════════════════════════════════════════════════
-- Было: designer_profiles_read using (id=auth.uid() OR is_public OR is_admin) — при
-- is_public=true ВСЯ строка (включая payout_details — банковские реквизиты — и tax_status)
-- читалась кем угодно, включая anon, прямым select. RLS построчный, не поколоночный,
-- поэтому публичную проекцию отдаём отдельной вьюхой (security_invoker=false: безопасный
-- набор колонок в обход RLS), а табличную политику сужаем до владельца/админа.
drop policy if exists "designer_profiles_read" on public.designer_profiles;
create policy "designer_profiles_read" on public.designer_profiles for select
  using ((id = (select auth.uid())) or private.is_admin());

create or replace view public.public_designer_profiles
with (security_invoker = false) as
  select id, display_name, bio, avatar_url
  from public.designer_profiles
  where is_public = true;

grant select on public.public_designer_profiles to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 4. PRINT_LIBRARY: дизайнер не правит себе royalty_pct / owner_id
-- ════════════════════════════════════════════════════════════════════
-- print_library_owner_update проверяет только owner_id, поэтому дизайнер мог PATCH'ем
-- выставить себе royalty_pct=99. moderation_status уже прикрыт этим триггером (0025) —
-- добавляем в UPDATE-ветку запрет смены royalty_pct и owner_id для не-админа.
create or replace function public.guard_print_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.owner_id is not null and auth.uid() is not null and not private.is_admin() then
      new.moderation_status := 'pending';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.moderation_status is distinct from old.moderation_status
       and auth.uid() is not null and not private.is_admin() then
      raise exception 'Модерацию принта меняет только админ';
    end if;
    if (new.royalty_pct is distinct from old.royalty_pct
        or new.owner_id is distinct from old.owner_id)
       and auth.uid() is not null and not private.is_admin() then
      raise exception 'Ставку роялти и владельца принта меняет только админ';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_print_moderation() from public, anon, authenticated;
-- триггер trg_guard_print_moderation (0025) ссылается на это имя — пересоздавать не нужно.

-- ════════════════════════════════════════════════════════════════════
-- 5. PLATFORM_SETTINGS: приватные ключи по умолчанию
-- ════════════════════════════════════════════════════════════════════
-- Было: ps_read using (true) — anon читал ВСЕ key/value. По мере наполнения (комиссии,
-- ключи интеграций, внутренние пороги) это утечка. Делаем приватным по умолчанию: anon
-- видит только is_public. Существующие ключи (контент лендинга и т.п.) сохраняем
-- публичными — поведение витрины не меняется.
alter table public.platform_settings
  add column if not exists is_public boolean not null default false;

update public.platform_settings set is_public = true where is_public = false;

drop policy if exists ps_read on public.platform_settings;
create policy ps_read on public.platform_settings for select
  using (is_public or private.is_admin());
-- ps_admin_write (FOR ALL, 0028) сохраняется — запись/полное чтение для admin.
