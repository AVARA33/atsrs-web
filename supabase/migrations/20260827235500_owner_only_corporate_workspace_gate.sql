-- Keep Corporate workspaces owner-only while the Corporate product is in development.
-- Personal workspaces remain available to every authenticated owner.

drop policy if exists "Users can create their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can create allowed ATSRS workspaces"
  on public.atsrs_workspaces
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      account_type = 'personal'
      or exists (
        select 1
        from public.atsrs_admin_users as admin_user
        where admin_user.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can view their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can view allowed ATSRS workspaces"
  on public.atsrs_workspaces
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      account_type = 'personal'
      or exists (
        select 1
        from public.atsrs_admin_users as admin_user
        where admin_user.user_id = (select auth.uid())
      )
    )
  );
