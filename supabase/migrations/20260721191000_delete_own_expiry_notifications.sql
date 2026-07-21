-- Let signed-in users permanently remove their own dashboard notifications.
-- The daily expiry job may create a fresh reminder later while the underlying
-- document remains due or expired.

grant delete
  on table public.atsrs_notifications
  to authenticated;

drop policy if exists "Users can delete their own ATSRS notifications"
  on public.atsrs_notifications;

create policy "Users can delete their own ATSRS notifications"
  on public.atsrs_notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
