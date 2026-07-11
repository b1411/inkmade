-- 0083: идемпотентность создания заказа (аудит 2026-07-11).
--
-- ПРОБЛЕМА: /api/orders/create ничем не дедуплицировал повторный сабмит — ретрай сети
-- или двойной клик после успешного создания плодил ВТОРОЙ заказ. Клиентские гарды
-- (paying-ref, очистка корзины) закрывают частые случаи, но не гонку/ретрай.
--
-- ФИКС: клиент шлёт стабильный idempotency_key (uuid) на попытку оформления. Сервер
-- сначала ищет заказ с этим ключом и возвращает его; на вставке — частичный UNIQUE
-- индекс (user_id, idempotency_key) ловит гонку двух параллельных запросов, второй
-- ловит 23505 и возвращает уже созданный заказ. Аддитивно, безопасно.

alter table public.orders add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_uniq
  on public.orders (user_id, idempotency_key)
  where idempotency_key is not null;
