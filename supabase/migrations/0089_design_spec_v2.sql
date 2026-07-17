-- 0089 — non-destructive design_spec v2 support.
-- Existing order snapshots are never rewritten. New editor drafts use revisioned rows;
-- published templates are read-only for customers and fully managed by admins.

alter table public.designs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision integer not null default 1,
  add column if not exists draft_status text not null default 'saved',
  add column if not exists draft_key text;

alter table public.designs
  drop constraint if exists designs_revision_positive,
  add constraint designs_revision_positive check (revision > 0),
  drop constraint if exists designs_draft_status_check,
  add constraint designs_draft_status_check check (draft_status in ('draft', 'saved', 'archived')),
  drop constraint if exists designs_draft_key_shape,
  add constraint designs_draft_key_shape check (draft_key is null or (length(draft_key) between 1 and 128));

create unique index if not exists designs_active_draft_unique
  on public.designs (user_id, product_id, draft_key)
  where draft_status = 'draft' and draft_key is not null;
create index if not exists designs_owner_updated_idx
  on public.designs (user_id, updated_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists designs_touch_updated_at on public.designs;
create trigger designs_touch_updated_at
before update on public.designs
for each row execute function private.touch_updated_at();

create table if not exists public.design_templates (
  id uuid primary key default gen_random_uuid(),
  product_type text not null,
  product_id uuid references public.products(id) on delete set null,
  print_mode text not null,
  spec jsonb not null,
  thumbnail_url text not null,
  title text not null,
  tags text[] not null default '{}',
  locale text not null default 'ru',
  status text not null default 'draft',
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_templates_locale_check check (locale in ('ru', 'kk')),
  constraint design_templates_status_check check (status in ('draft', 'published', 'archived')),
  constraint design_templates_spec_object check (jsonb_typeof(spec) = 'object'),
  constraint design_templates_title_shape check (length(btrim(title)) between 1 and 160),
  constraint design_templates_product_type_shape check (length(btrim(product_type)) between 1 and 64),
  constraint design_templates_print_mode_shape check (length(btrim(print_mode)) between 1 and 32)
);

create index if not exists design_templates_discovery_idx
  on public.design_templates (status, locale, product_type, print_mode, sort, created_at desc);
create index if not exists design_templates_tags_idx
  on public.design_templates using gin (tags);

drop trigger if exists design_templates_touch_updated_at on public.design_templates;
create trigger design_templates_touch_updated_at
before update on public.design_templates
for each row execute function private.touch_updated_at();

alter table public.design_templates enable row level security;

drop policy if exists design_templates_public_read on public.design_templates;
create policy design_templates_public_read on public.design_templates for select
  using (status = 'published' or (select private.is_admin()));

drop policy if exists design_templates_admin_all on public.design_templates;
create policy design_templates_admin_all on public.design_templates for all
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.design_templates to anon, authenticated;
grant insert, update, delete on public.design_templates to authenticated;

comment on column public.designs.revision is 'Optimistic concurrency revision for autosaved drafts.';
comment on column public.designs.draft_status is 'draft = autosave, saved = explicit user save, archived = superseded.';
comment on table public.design_templates is 'Curated design_spec v2 Quick Designs, localized and product/print-mode compatible.';

-- Rollback (intentional/manual): drop design_templates; drop trigger/function only
-- after checking no other table uses private.touch_updated_at; draft columns can stay
-- harmlessly because every change in this migration is additive.
