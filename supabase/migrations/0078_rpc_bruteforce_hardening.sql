-- 0078 — Фаза 6 харденинга (аудит готовности 2026-07-07): анти-брутфорс публичных RPC.
-- Публичные SECURITY DEFINER RPC вызываются anon напрямую через /rest/v1/rpc/, минуя
-- app-rate-limit (он матчит только /api/**). Точечный фикс (решение владельца).
--
-- A) shop_promo_validate — оракул перебора промокодов магазина. Легитимно вызывается
--    ТОЛЬКО сервером: resolveShopPromo (server/utils/shop-promo.ts) под service_role в
--    составе /api/orders/create (а он под app-rate-limit). Клиент напрямую его не зовёт.
--    → отзываем прямой доступ anon/authenticated; service_role сохраняет (сервер работает).
revoke execute on function public.shop_promo_validate(uuid, text, numeric) from public, anon, authenticated;
grant  execute on function public.shop_promo_validate(uuid, text, numeric) to service_role;

-- B) access_code закрытых витрин — вектор перебора через shop_storefront /
--    shop_item_buy_payload (они остаются anon по дизайну публичной витрины). Клиент
--    теперь генерирует неугадываемый код (10 символов), а этот CHECK страхует и прямой
--    API: пустой код запрещён, короткий (<8) — тоже. В проде 0 магазинов → нарушений нет.
alter table public.shops drop constraint if exists shops_access_code_len;
alter table public.shops add constraint shops_access_code_len
  check (access_code is null or char_length(access_code) >= 8);
