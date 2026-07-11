-- 0081: атомарный потолок использований промокода в apply_paid.
--
-- ПРОБЛЕМА (аудит 2026-07-11): used_count инкрементился при оплате БЕЗ ре-проверки
-- лимита под локом. Проверка max_uses делается при СОЗДАНИИ заказа, но она неатомарна
-- между разными заказами → два параллельных (или создан-раньше-оплачен-позже) заказа
-- с одним одноразовым кодом оба инкрементят при оплате, превышая max_uses.
--
-- ФИКС: инкремент под row-lock с гардом `used_count < max_uses` в самом UPDATE —
-- если лимит уже достигнут, строка не обновляется (счётчик остаётся на max), а платёж
-- НЕ падает (скидка на этот заказ уже зафиксирована при создании — §промо, компромисс
-- допускает лёгкую пере-выдачу самой скидки, но счётчик использований теперь точен).
--
-- ⚠️ КРИТИЧНЫЙ ПЛАТЁЖНЫЙ RPC. Тело apply_paid воспроизведено ДОСЛОВНО из 0075 —
-- изменён ТОЛЬКО блок инкремента промокодов (строки с used_count = used_count + 1):
-- добавлено условие `and (max_uses is null or used_count < max_uses)`. Всё остальное
-- (сток, cogs, роялти, доля магазина, finance, фискальная заглушка) — без изменений.
-- Перед накатом: сверить diff с 0075 и прогнать на staging/через транзакцию с откатом.

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
    -- инкремент под row-lock + гард лимита: при гонке не превышаем max_uses
    -- (создание заказа проверяет лимит неатомарно между заказами — фикс 0081).
    update public.promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code)
        and (max_uses is null or used_count < max_uses);
    -- промокод магазина: инкремент по коду в магазинах, чьи позиции получили скидку
    update public.shop_promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code)
        and (max_uses is null or used_count < max_uses)
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
