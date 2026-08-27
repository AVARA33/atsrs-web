-- Keep Corporate owner-only without making ordinary Personal workspace reads
-- depend on direct access to the private admin membership table.
create or replace function public.atsrs_is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.atsrs_admin_users as admin_user
    where admin_user.user_id = auth.uid()
  );
$$;

revoke all on function public.atsrs_is_current_admin() from public, anon;
grant execute on function public.atsrs_is_current_admin() to authenticated;

drop policy if exists "Users can create allowed ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can create allowed ATSRS workspaces"
  on public.atsrs_workspaces
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      account_type = 'personal'
      or (account_type = 'company' and public.atsrs_is_current_admin())
    )
  );

drop policy if exists "Users can view allowed ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can view allowed ATSRS workspaces"
  on public.atsrs_workspaces
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and (
      account_type = 'personal'
      or (account_type = 'company' and public.atsrs_is_current_admin())
    )
  );
