-- 0085: admin_finance_series тоже вычитает shop_share из дневного profit (аудит 2026-07-12).
--
-- ПРОБЛЕМА: 0084 починил profit в admin_finance_stats (сводка), но дневной ряд
-- admin_finance_series (график тренда) остался со старой формулой без shop_share →
-- дневная прибыль на графике завышена на Σ shop_share за день. Тело воспроизведено
-- ДОСЛОВНО из прод-версии, добавлено только вычитание shop_share.

create or replace function public.admin_finance_series(
  p_from timestamptz default (now() - '30 days'::interval), p_to timestamptz default now()
) returns jsonb language plpgsql security definer set search_path to '' as $function$
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
        - coalesce(sum(amount) filter (where entry_type = 'shop_share'), 0)
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
$function$;
