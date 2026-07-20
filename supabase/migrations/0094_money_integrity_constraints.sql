-- 0094: последний рубеж БД по деньгам и целостности.
--
-- До этой миграции неотрицательность сумм, единственность начисления на позицию и
-- сохранность истории заказа держались ИСКЛЮЧИТЕЛЬНО на прикладном коде
-- (Math.max(0, ...) в orders/create, guard_orders_update, advisory-локи в apply_paid).
-- Любая новая точка записи обходила защиту молча. Здесь инварианты переносятся в схему.
--
-- Все проверки безопасны для текущих прод-данных: сверочные запросы на момент
-- 2026-07-20 дали нули (нет отрицательных сумм, нет позиций без арта, нет дублей
-- начислений, orders.total сходится с суммой позиций до копейки).

-- ---------------------------------------------------------------------------
-- 1. Неотрицательность денег
-- ---------------------------------------------------------------------------

alter table public.orders
  drop constraint if exists orders_total_nonneg,
  add constraint orders_total_nonneg check (total >= 0);

alter table public.orders
  drop constraint if exists orders_discount_nonneg,
  add constraint orders_discount_nonneg check (discount >= 0);

alter table public.order_items
  drop constraint if exists order_items_unit_price_nonneg,
  add constraint order_items_unit_price_nonneg check (unit_price >= 0);

alter table public.order_items
  drop constraint if exists order_items_unit_cost_nonneg,
  add constraint order_items_unit_cost_nonneg check (unit_cost >= 0);

alter table public.order_items
  drop constraint if exists order_items_line_discount_nonneg,
  add constraint order_items_line_discount_nonneg check (line_discount >= 0);

alter table public.payments
  drop constraint if exists payments_amount_nonneg,
  add constraint payments_amount_nonneg check (amount >= 0);

alter table public.payouts
  drop constraint if exists payouts_amount_nonneg,
  add constraint payouts_amount_nonneg check (amount >= 0);

-- НАМЕРЕННО без CHECK на royalty_earnings.amount и shop_earnings.amount:
-- 0022 явно документирует amount как «начислено (+) или аннулировано (−)»,
-- то есть отрицательная строка — часть штатной модели сторнирования.

-- ---------------------------------------------------------------------------
-- 2. Возврат должен оставлять платёжный след
--    refund_order пишет строку в payments; статус 'refunded' раньше был запрещён.
-- ---------------------------------------------------------------------------

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'success', 'failed', 'refunded'));

-- ---------------------------------------------------------------------------
-- 3. Валюта — из фиксированного словаря (ePay работает в тенге)
-- ---------------------------------------------------------------------------

alter table public.orders
  drop constraint if exists orders_currency_check,
  add constraint orders_currency_check check (currency in ('KZT'));

-- ---------------------------------------------------------------------------
-- 4. Двойное начисление невозможно на уровне схемы.
--    Идемпотентность держалась только на `if v_order.paid_at is not null then return`
--    внутри apply_paid; любой другой путь задваивал деньги без сопротивления БД.
-- ---------------------------------------------------------------------------

create unique index if not exists shop_earnings_order_item_uniq
  on public.shop_earnings (order_item_id)
  where order_item_id is not null;

create unique index if not exists royalty_earnings_order_item_uniq
  on public.royalty_earnings (order_item_id)
  where order_item_id is not null;

-- ---------------------------------------------------------------------------
-- 5. У позиции заказа должен быть источник арта.
--    Схема допускала строку одновременно без design_id и без print_id —
--    оператор получал в производство заказ, к которому нечего печатать.
-- ---------------------------------------------------------------------------

alter table public.order_items
  drop constraint if exists order_items_art_source,
  add constraint order_items_art_source
  check (design_id is not null or print_id is not null);

-- ---------------------------------------------------------------------------
-- 6. Один магазин на владельца.
--    create_my_shop проверяет это read-before-insert; два параллельных вызова
--    (двойной клик, ретрай) создавали два магазина, после чего getMine()
--    и middleware брали произвольный первый.
-- ---------------------------------------------------------------------------

create unique index if not exists shops_owner_uniq
  on public.shops (owner_id)
  where owner_id is not null;

-- ---------------------------------------------------------------------------
-- 7. Финансовый след переживает удаление заказа.
--    finance_entries и royalty_earnings уже на SET NULL; shop_earnings был на
--    CASCADE — удаление заказа стирало начисление, а денормализованный
--    shop_balances.available оставался завышенным навсегда.
-- ---------------------------------------------------------------------------

alter table public.shop_earnings
  alter column order_id drop not null;

alter table public.shop_earnings
  drop constraint if exists shop_earnings_order_id_fkey;

alter table public.shop_earnings
  add constraint shop_earnings_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 8. updated_at перестаёт врать.
--    private.touch_updated_at() был навешан только на designs и design_templates.
--    Хуже всего было у cart_items: клиент пишет строку через upsert по PK и
--    updated_at туда не кладёт вовсе — колонка навсегда равнялась now() первой вставки.
-- ---------------------------------------------------------------------------

drop trigger if exists touch_cart_items on public.cart_items;
create trigger touch_cart_items before update on public.cart_items
  for each row execute function private.touch_updated_at();

drop trigger if exists touch_ai_quotas on public.ai_quotas;
create trigger touch_ai_quotas before update on public.ai_quotas
  for each row execute function private.touch_updated_at();

drop trigger if exists touch_shop_balances on public.shop_balances;
create trigger touch_shop_balances before update on public.shop_balances
  for each row execute function private.touch_updated_at();

drop trigger if exists touch_designer_balances on public.designer_balances;
create trigger touch_designer_balances before update on public.designer_balances
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Индексы: 10 FK без покрытия (advisor unindexed_foreign_keys) + горячий
--    orders.created_at, по которому сортируют все админ-списки и admin_finance_series.
-- ---------------------------------------------------------------------------

create index if not exists cart_items_product_idx      on public.cart_items (product_id);
create index if not exists cart_items_variant_idx      on public.cart_items (variant_id);
create index if not exists cart_items_shop_item_idx    on public.cart_items (shop_item_id);
create index if not exists design_templates_product_idx on public.design_templates (product_id);
create index if not exists designs_ai_generation_idx   on public.designs (ai_generation_id);
create index if not exists shop_applications_resolved_by_idx on public.shop_applications (resolved_by);
create index if not exists shop_earnings_order_item_idx on public.shop_earnings (order_item_id);
create index if not exists shop_items_product_idx      on public.shop_items (product_id);
create index if not exists shop_items_variant_idx      on public.shop_items (variant_id);
create index if not exists shops_application_idx       on public.shops (application_id);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 10. designerMarketplace выключен флагом, но RPC оставалась доступна.
--     mark_payout_paid помечает 'paid' ВСЕ accrued-начисления дизайнера, а не
--     входящие в выплату: запросив 300 из 1000, дизайнер обнулял весь долг,
--     после чего refund_order не находил 'accrued' и не сторнировал возврат.
--     До исправления самой функции убираем её из досягаемости клиента.
-- ---------------------------------------------------------------------------

revoke execute on function public.mark_payout_paid(uuid) from public;
revoke execute on function public.mark_payout_paid(uuid) from anon;
revoke execute on function public.mark_payout_paid(uuid) from authenticated;
