-- INKMADE — миграция 0015: убрать enforce_publish_requirements из публичного RPC API
-- Это триггер-функция (вызывается БД при INSERT/UPDATE products), её не должно быть
-- видно как /rest/v1/rpc/. Триггер продолжает работать после revoke (выполняется
-- в контексте владельца таблицы). adjust_stock/admin_stats остаются доступны
-- authenticated намеренно — внутри строгая проверка роли (private.is_staff/is_admin).

revoke all on function public.enforce_publish_requirements() from public, anon, authenticated;
