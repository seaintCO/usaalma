-- Deterministic migration version: 20260714008000. Requires invoices and agent_executions.
begin;
alter table public.invoices add column if not exists invoice_number text; alter table public.invoices add column if not exists client_email text; alter table public.invoices add column if not exists client_phone text; alter table public.invoices add column if not exists billing_address text;
alter table public.invoices add column if not exists issue_date date default current_date; alter table public.invoices add column if not exists due_date date; alter table public.invoices add column if not exists currency text not null default 'USD';
alter table public.invoices add column if not exists subtotal numeric not null default 0; alter table public.invoices add column if not exists tax_amount numeric not null default 0; alter table public.invoices add column if not exists discount_amount numeric not null default 0; alter table public.invoices add column if not exists total numeric not null default 0;
alter table public.invoices add column if not exists notes text; alter table public.invoices add column if not exists terms text; alter table public.invoices add column if not exists source text not null default 'manual'; alter table public.invoices add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.invoices add column if not exists sent_at timestamptz; alter table public.invoices add column if not exists viewed_at timestamptz; alter table public.invoices add column if not exists paid_at timestamptz; alter table public.invoices add column if not exists updated_at timestamptz not null default now();
alter table public.invoices add column if not exists duplicate_key text;
update public.invoices set status='draft' where status='borrador';
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check(status in('draft','sent','viewed','paid','overdue','cancelled'));
create table if not exists public.invoice_line_items (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 description text not null, quantity numeric not null default 1 check(quantity>0), unit_price numeric not null default 0 check(unit_price>=0), line_total numeric not null default 0 check(line_total>=0), position integer not null default 0,
 source_execution_id uuid references public.agent_executions(id) on delete set null, idempotency_key text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.invoice_line_items add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.invoice_line_items add column if not exists idempotency_key text;
create unique index if not exists invoices_user_number_idx on public.invoices(user_id,invoice_number) where invoice_number is not null;
create unique index if not exists invoices_alma_execution_idx on public.invoices(user_id,source_execution_id) where source='alma_chat' and source_execution_id is not null;
create unique index if not exists invoices_duplicate_key_idx on public.invoices(user_id,duplicate_key) where duplicate_key is not null;
create unique index if not exists invoice_line_items_idempotency_idx on public.invoice_line_items(invoice_id,idempotency_key) where idempotency_key is not null;
create index if not exists invoice_lines_invoice_idx on public.invoice_line_items(invoice_id,user_id);
create or replace function public.invoice_set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.assert_invoice_line_ownership() returns trigger language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.invoices i where i.id=new.invoice_id and i.user_id=new.user_id) then raise exception 'invoice line must belong to invoice owner' using errcode='42501'; end if; return new; end $$;
drop trigger if exists invoices_updated_at on public.invoices; create trigger invoices_updated_at before update on public.invoices for each row execute function public.invoice_set_updated_at();
drop trigger if exists invoice_line_items_updated_at on public.invoice_line_items; create trigger invoice_line_items_updated_at before update on public.invoice_line_items for each row execute function public.invoice_set_updated_at();
drop trigger if exists invoice_line_items_owner on public.invoice_line_items; create trigger invoice_line_items_owner before insert or update on public.invoice_line_items for each row execute function public.assert_invoice_line_ownership();
alter table public.invoices enable row level security; alter table public.invoice_line_items enable row level security;
drop policy if exists "Users manage own invoices" on public.invoices; drop policy if exists "Users manage own invoice items" on public.invoice_line_items;
create policy "Users manage own invoices" on public.invoices for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users manage own invoice items" on public.invoice_line_items for all to authenticated using(user_id=auth.uid() and exists(select 1 from public.invoices i where i.id=invoice_id and i.user_id=auth.uid())) with check(user_id=auth.uid() and exists(select 1 from public.invoices i where i.id=invoice_id and i.user_id=auth.uid()));
commit;
