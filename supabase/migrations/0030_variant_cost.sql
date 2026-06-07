-- 0030: себестоимость заготовки на вариант (CRM §6.2 маржа, §8.4).
-- Без этого order_items.unit_cost всегда 0 → cogs=0 → чистая прибыль завышена.
-- Админ задаёт blank_cost на складе; при создании заказа она фиксируется в unit_cost.

alter table public.variants add column if not exists blank_cost numeric(12, 2) not null default 0;

comment on column public.variants.blank_cost is
  'Себестоимость заготовки (закуп) для расчёта маржи и cogs. Фиксируется в order_items.unit_cost при заказе.';
