begin;
create table public.atsrs_request_notification_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 read_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.atsrs_request_notification_reads enable row level security;
revoke all on public.atsrs_request_notification_reads from public,anon,authenticated;
grant select,insert on public.atsrs_request_notification_reads to authenticated;
create policy "Read own notification receipts" on public.atsrs_request_notification_reads
 for select to authenticated using ((select auth.uid())=user_id);
create policy "Record own notification receipts" on public.atsrs_request_notification_reads
 for insert to authenticated with check ((select auth.uid())=user_id);
comment on table public.atsrs_request_notification_reads is 'Monotonic account-scoped read receipts; never changes download approval or request status.';
commit;
