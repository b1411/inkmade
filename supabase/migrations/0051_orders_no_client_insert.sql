-- INKMADE — миграция 0051: закрытие подмены цены через прямой клиентский INSERT
-- (аудит 2026-06-29, CRITICAL #2).
--
-- ПРОБЛЕМА: политики orders_owner_insert / order_items_owner_insert разрешали
-- любому залогиненному пользователю вставить заказ и позиции НАПРЯМУЮ через
-- PostgREST с ПРОИЗВОЛЬНЫМИ total / unit_price / unit_cost / print_owner_id
-- (проверялось только владение + статус created/pending, но НЕ значения денег).
-- Это полностью обходило серверный пересчёт цены в /api/orders/create:
-- атакующий вставлял orders.total = 1, order_items.unit_price = 1 и платил 1 ₸,
-- либо начислял роялти подставному print_owner_id.
--
-- РЕШЕНИЕ: убрать клиентский путь записи целиком. ВСЕ заказы создаются только
-- сервером через serverSupabaseServiceRole (service_role обходит RLS), где цена
-- пересчитывается по БД. Клиенту остаётся ТОЛЬКО чтение своих заказов/позиций
-- (политики *_owner_read сохранены). Проверено: ни один клиентский флоу не
-- вставляет orders/order_items напрямую (useOrder → $fetch('/api/orders/create');
-- reorder только читает; seed-скрипт работает service_role-ключом).

drop policy if exists "orders_owner_insert" on public.orders;
drop policy if exists "order_items_owner_insert" on public.order_items;

-- Намеренно НЕ создаём замену: запись orders/order_items — исключительно
-- service_role (серверный эндпоинт). Если в будущем понадобится клиентский
-- INSERT — он ОБЯЗАН идти через триггер, пересчитывающий total/unit_price из БД.
