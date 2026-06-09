-- 0038: версионирование дизайна (CRM §3.1 «доработать»). Новая версия ссылается на исходную.
alter table public.designs add column if not exists parent_design_id uuid
  references public.designs (id) on delete set null;
create index if not exists designs_parent_idx on public.designs (parent_design_id);
