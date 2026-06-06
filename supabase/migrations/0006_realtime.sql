-- INKMADE — миграция 0006: Realtime для очереди производства (§8.3).
-- Доска /studio обновляется без поллинга. RLS по-прежнему фильтрует события
-- (оператор/админ видят оплаченные заказы).
alter publication supabase_realtime add table orders;
