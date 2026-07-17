-- ATSRS server-side Personal / Corporate workspace registry.
-- Run this once in Supabase Dashboard -> SQL Editor.

begin;

create table if not exists public.atsrs_workspaces (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('personal', 'company')),
  created_at timestamptz not null default now(),
  primary key (user_id, account_type)
);

alter table public.atsrs_workspaces enable row level security;

drop policy if exists "Users can view their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can view their own ATSRS workspaces"
  on public.atsrs_workspaces
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can create their own ATSRS workspaces"
  on public.atsrs_workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.atsrs_workspaces from anon;
revoke update, delete, truncate, references, trigger
  on table public.atsrs_workspaces from authenticated;
grant select, insert on table public.atsrs_workspaces to authenticated;

commit;
