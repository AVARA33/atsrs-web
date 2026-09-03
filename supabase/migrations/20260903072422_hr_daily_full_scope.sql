begin;
create table public.atsrs_hr_source_scope (
 name text primary key, careers_url text, website text, evidence_url text, boards text[] not null default '{}',
 cadence text not null default 'daily', connector_state text not null check(connector_state in ('connected','needs_connector','missing_source','review')),
 last_checked_at timestamptz, http_status integer, last_error text
);
alter table public.atsrs_hr_source_scope enable row level security;
revoke all on public.atsrs_hr_source_scope from public,anon,authenticated;
grant select,update on public.atsrs_hr_source_scope to service_role;
alter table public.atsrs_job_sources add column last_full_scan_at timestamptz;
-- Keep the report owner gate on the server, before any source or cost data is returned.
create function public.atsrs_get_hr_scope() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object('scope',(select coalesce(jsonb_agg(to_jsonb(s) order by name),'[]') from public.atsrs_hr_source_scope s),
 'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by board),'[]') from public.atsrs_job_sources s),
 'pending',(select count(*) from public.atsrs_job_ingestion_queue where state='pending'),
 'review',(select count(*) from public.atsrs_job_ingestion_queue where state='review')) into result;
 return result;
end $$;
revoke all on function public.atsrs_get_hr_scope() from public,anon,authenticated;
grant execute on function public.atsrs_get_hr_scope() to authenticated;
-- Approved by owner: hard HR-only monthly ceiling. Shared balance is not increased here.
update public.atsrs_job_ingestion_config set monthly_limit=15;
commit;
