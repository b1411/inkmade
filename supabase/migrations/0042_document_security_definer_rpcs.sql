-- B6: зафиксировать РЕШЕНИЕ по 13 SECURITY DEFINER RPC (advisor 0029 WARN).
-- РЕШЕНИЕ: НЕ делать REVOKE EXECUTE FROM authenticated. Каждая функция проверяет
-- роль ВНУТРИ (private.is_admin/is_staff/is_designer или auth.uid()), и её
-- легитимный вызыватель — именно authenticated (админ/оператор/дизайнер/владелец
-- инвайта). REVOKE сломал бы кабинеты. Денежно-складские мутации, которые НЕ должны
-- быть доступны клиенту (apply_paid/change_order_status/bump_promo_use), уже закрыты
-- грантом (только service_role). Advisor 0029 здесь = defense-in-depth, не уязвимость.
-- COMMENT закрепляет это, чтобы WARN не «исправили» вслепую.

comment on function public.adjust_stock(uuid, integer, text) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_staff(). НЕ REVOKE (advisor 0029 = defense-in-depth).';
comment on function public.admin_finance_series(timestamptz, timestamptz) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.admin_finance_stats(timestamptz, timestamptz) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.admin_list_users() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.admin_margin_breakdown() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.admin_stats() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.claim_designer_invite(text) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: любой вошедший активирует СВОЙ инвайт по токену (проверка токена внутри). НЕ REVOKE.';
comment on function public.mark_payout_paid(uuid) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.refund_order(uuid, text) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.request_payout(numeric, text, jsonb) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: дизайнер запрашивает выплату себе (внутренняя проверка private.is_designer + auth.uid). НЕ REVOKE.';
comment on function public.set_royalty_rate(uuid, numeric) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
comment on function public.studio_get_order(uuid) is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: данные цеха без финансов, внутренняя проверка private.is_staff(). НЕ REVOKE.';
comment on function public.studio_list_queue() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: очередь цеха без финансов, внутренняя проверка private.is_staff(). НЕ REVOKE.';
