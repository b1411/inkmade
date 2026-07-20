-- 0093: разрешить статус 'reversed' у начислений B2B-магазина.
--
-- БЛОКЕР. Функции refund_order и change_order_status (обе из 0084) выполняют
--   update public.shop_earnings set status = 'reversed' ...
-- но CHECK, заведённый вместе с таблицей, знает только ('accrued','paid').
-- Итог: ЛЮБОЙ возврат или отмена оплаченного заказа, содержащего позицию магазина,
-- падает с 23514 check_violation и откатывает всю транзакцию — деньги не возвращены,
-- статус заказа не меняется, админ видит сырую ошибку Postgres.
--
-- У royalty_earnings 'reversed' в CHECK есть с 0022; здесь приводим shop_earnings
-- к тому же словарю. Не выстрелило до сих пор только потому, что shop_earnings пуста.

alter table public.shop_earnings
  drop constraint if exists shop_earnings_status_check;

alter table public.shop_earnings
  add constraint shop_earnings_status_check
  check (status in ('accrued', 'paid', 'reversed'));
