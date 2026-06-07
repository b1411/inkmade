-- 0034: аналитика для админ-финансов (CRM §6.1, §6.2): динамика P&L по дням + маржа по разрезам.

-- ── Динамика выручки/прибыли по дням (для графика) ──
create or replace function public.admin_finance_series(
  p_from timestamptz default (now() - interval '30 days'), p_to timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  select coalesce(jsonb_agg(row order by row->>'day'), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
      'revenue', coalesce(sum(amount) filter (where entry_type = 'revenue'), 0),
      'profit',
        coalesce(sum(amount) filter (where entry_type = 'revenue'), 0)
        - coalesce(sum(amount) filter (where entry_type = 'cogs'), 0)
        - coalesce(sum(amount) filter (where entry_type = 'royalty'), 0)
        - coalesce(sum(amount) filter (where entry_type = 'shipping'), 0)
        - coalesce(sum(amount) filter (where entry_type = 'acquiring_fee'), 0)
        - coalesce(sum(amount) filter (where entry_type = 'refund'), 0)
    ) as row
    from public.finance_entries
    where created_at >= p_from and created_at <= p_to
    group by date_trunc('day', created_at)
  ) s;
  return v;
end;
$$;

-- ── Маржа по изделиям и методам (только оплаченные заказы) ──
create or replace function public.admin_margin_breakdown()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_products jsonb; v_methods jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;

  select coalesce(jsonb_agg(r order by (r->>'margin')::numeric desc), '[]'::jsonb) into v_products
  from (
    select jsonb_build_object(
      'title', p.title,
      'qty', sum(oi.quantity),
      'revenue', sum(oi.unit_price * oi.quantity),
      'cost', sum(oi.unit_cost * oi.quantity),
      'margin', sum((oi.unit_price - oi.unit_cost) * oi.quantity)
    ) as r
    from public.order_items oi
    join public.orders o on o.id = oi.order_id and o.paid_at is not null
    join public.variants v on v.id = oi.variant_id
    join public.products p on p.id = v.product_id
    group by p.title
  ) sp;

  select coalesce(jsonb_agg(r order by (r->>'margin')::numeric desc), '[]'::jsonb) into v_methods
  from (
    select jsonb_build_object(
      'method', coalesce(oi.print_method, '—'),
      'qty', sum(oi.quantity),
      'revenue', sum(oi.unit_price * oi.quantity),
      'cost', sum(oi.unit_cost * oi.quantity),
      'margin', sum((oi.unit_price - oi.unit_cost) * oi.quantity)
    ) as r
    from public.order_items oi
    join public.orders o on o.id = oi.order_id and o.paid_at is not null
    group by oi.print_method
  ) sm;

  return jsonb_build_object('by_product', v_products, 'by_method', v_methods);
end;
$$;

revoke all on function public.admin_finance_series(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finance_series(timestamptz, timestamptz) to authenticated;
revoke all on function public.admin_margin_breakdown() from public, anon;
grant execute on function public.admin_margin_breakdown() to authenticated;
