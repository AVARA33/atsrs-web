revoke all on public.atsrs_notification_preferences from anon, authenticated;
revoke all on public.atsrs_notifications from anon, authenticated;
revoke all on public.atsrs_notification_outbox from anon, authenticated;

grant select, insert, update on public.atsrs_notification_preferences to authenticated;
grant select on public.atsrs_notifications to authenticated;
grant update (read_at) on public.atsrs_notifications to authenticated;;
