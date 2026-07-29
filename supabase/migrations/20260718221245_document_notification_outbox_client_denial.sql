create policy "Clients cannot access ATSRS notification outbox"
on public.atsrs_notification_outbox
for all
to anon, authenticated
using (false)
with check (false);;
