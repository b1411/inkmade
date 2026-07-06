-- INKMADE — миграция 0076: харденинг по аудиту безопасности 2026-07-06.
-- Полный аудит RLS/доступа (агенты «orders access» + «B2B shops») закрыл вопрос:
-- критических/HIGH-дыр в финальном состоянии схемы нет. Осталось 4 находки
-- целостности/приватности (2×MEDIUM, 2×LOW) — их и чиним. Все — hardening, не меняют
-- ни одной таблицы/RPC-сигнатуры (регенерация database.types.ts не требуется).

-- ── A1 (MEDIUM): payments.amount не должен быть виден операторам ──────────────
-- 0029 намеренно убрал у операторов доступ к суммам заказа (order_items → admin-only,
-- studio_* RPC стрипают total/unit_price/unit_cost). Но payments_staff_read (0005)
-- оставлял операторам чтение public.payments, где amount = total оплаченного заказа —
-- та же утечка финансов, которую 0029 закрывал. Ограничиваем чтение до администратора.
drop policy if exists payments_staff_read on public.payments;
drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments for select
  using (private.is_admin());

-- ── A2 (LOW): stock_movements — запись только служебная, через RPC ────────────
-- stock_staff_write (0005) позволял оператору/админу прямой INSERT/UPDATE/DELETE в
-- журнал движений через PostgREST. Прямая запись НЕ обновляет variants.stock (это
-- атомарно делают только adjust_stock/apply_paid) → рассинхрон журнала и остатка,
-- а DELETE стирает аудит. Инвариант §5.3.1 «запись склада только сервис/RPC».
-- Убираем прямую запись; чтение (stock_staff_read) остаётся. Клиентский путь —
-- adjust_stock (0013), начисление — apply_paid (оба SECURITY DEFINER с проверкой роли).
drop policy if exists stock_staff_write on public.stock_movements;

-- ── A3 (LOW): user_consents INSERT сверяет владение order_id ──────────────────
-- consents_owner_insert (0041) проверял только user_id, но не то, что привязанный
-- order_id принадлежит вызывающему — клиент мог вставить согласие с чужим order_id.
-- Импакт минимален (согласия аддитивны, доступа не дают; боевой путь — сервер через
-- service-role), но проверку выравниваем с паттерном владения заказом. order_id NULL
-- (согласие при регистрации, register.vue) остаётся разрешённым.
drop policy if exists "consents_owner_insert" on public.user_consents;
create policy "consents_owner_insert" on public.user_consents for insert
  with check (
    user_id = (select auth.uid())
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = order_id and o.user_id = (select auth.uid())
      )
    )
  );

-- ── A4 (MEDIUM): ценовой пол позиции витрины покрывает себестоимость ──────────
-- guard_shop_item (0069) проверял только price+markup>0. Экономика (apply_paid 0075):
-- владелец получает 100% наценки + revenue_share_pct% от базы (price); платформа
-- удерживает price*(100−rate)% и при этом платит себестоимость заготовки (blank_cost →
-- finance cogs). Поле price владелец задаёт сам, пола не было → при price=0 (или ниже
-- себестоимости) платформа уходит в минус на COGS, а «(100−rate)% базы защищено» —
-- иллюзия, т.к. база владелец-контролируемая. Требуем: удерживаемая платформой база
-- покрывает себестоимость → price*(100−rate) ≥ blank_cost*100 (при rate=0 → price ≥
-- blank_cost; общий вид защищает при любой доле, а rate≥100 корректно запрещает любой
-- price). Пол применяется только к активной позиции с определяемым вариантом и cost>0.
-- Существующие проверки F2/F3 сохранены дословно.
create or replace function public.guard_shop_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner        uuid;
  v_design_owner uuid;
  v_variant_id   uuid;
  v_blank        numeric;
  v_rate         numeric;
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

  -- A4: база (price) обязана покрывать себестоимость заготовки после доли платформы
  if new.is_active then
    v_variant_id := coalesce(
      new.variant_id,
      (select variant_id from public.designs where id = new.design_id)
    );
    if v_variant_id is not null then
      select coalesce(blank_cost, 0) into v_blank from public.variants where id = v_variant_id;
      select coalesce(revenue_share_pct, 0) into v_rate from public.shops where id = new.shop_id;
      if coalesce(v_blank, 0) > 0
         and coalesce(new.price, 0) * (100 - coalesce(v_rate, 0)) < coalesce(v_blank, 0) * 100 then
        raise exception 'Базовая цена позиции должна покрывать себестоимость заготовки';
      end if;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.guard_shop_item() from public, anon, authenticated;
-- триггер trg_guard_shop_item (0069) привязан по имени функции — create or replace
-- сохраняет привязку, пересоздавать его не нужно.
