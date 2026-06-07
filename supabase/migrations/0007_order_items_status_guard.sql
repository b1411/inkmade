-- INKMADE — миграция 0007: запрет добавления позиций в неоформляемый заказ (аудит H3)
-- Раньше order_items_owner_insert разрешал INSERT в заказ любого статуса (вкл. paid/shipped).
-- Клиент должен добавлять позиции только в собираемый заказ (created/pending).

drop policy if exists order_items_owner_insert on order_items;

create policy order_items_owner_insert on order_items for insert
  with check (exists (
    select 1 from orders o
    where o.id = order_id
      and o.user_id = auth.uid()
      and o.status in ('created', 'pending')
  ));
