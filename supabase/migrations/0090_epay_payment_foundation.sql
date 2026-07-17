-- 0090: production ePay foundation. Additive and backward-compatible.
-- Rollback: drop trigger trg_payment_provider_from_payload on payments;
-- drop function public.payment_provider_from_payload(); drop column orders.payment_invoice_id;
-- drop sequence public.epay_invoice_seq. Do not rollback after invoices were issued.

create sequence if not exists public.epay_invoice_seq start with 100000;

alter table public.orders
  add column if not exists payment_invoice_id text;

update public.orders
set payment_invoice_id = lpad(nextval('public.epay_invoice_seq')::text, 15, '0')
where payment_invoice_id is null;

alter table public.orders
  alter column payment_invoice_id set default lpad(nextval('public.epay_invoice_seq')::text, 15, '0'),
  alter column payment_invoice_id set not null;

alter table public.orders
  drop constraint if exists orders_payment_invoice_id_format;
alter table public.orders
  add constraint orders_payment_invoice_id_format
  check (payment_invoice_id ~ '^[0-9]{6,15}$');

create unique index if not exists orders_payment_invoice_id_uniq
  on public.orders(payment_invoice_id);

-- The historical apply_paid function inserts provider='mock'. Preserve its audited,
-- stock-safe body and correct the journal row from the server-verified raw payload.
create or replace function public.payment_provider_from_payload()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_provider text;
begin
  v_provider := nullif(new.raw_payload ->> 'provider', '');
  if v_provider in ('mock', 'epay') then new.provider := v_provider; end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_provider_from_payload on public.payments;
create trigger trg_payment_provider_from_payload
before insert on public.payments
for each row execute function public.payment_provider_from_payload();

revoke all on function public.payment_provider_from_payload() from public, anon, authenticated;
