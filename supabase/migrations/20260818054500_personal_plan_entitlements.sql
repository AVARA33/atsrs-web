-- ATSRS Personal plan entitlement source of truth.
-- The legacy `pro` subscription key is the currently available Bronze tier.

begin;

create schema if not exists private;

create table if not exists private.atsrs_personal_plan_entitlements (
  plan_key text primary key check (plan_key in ('free', 'pro', 'business')),
  public_name text not null,
  tracked_documents_limit integer not null check (tracked_documents_limit > 0),
  storage_bytes_limit bigint check (storage_bytes_limit is null or storage_bytes_limit > 0),
  profile_cv_limit integer not null check (profile_cv_limit > 0),
  email_expiry_alerts_limit integer check (email_expiry_alerts_limit is null or email_expiry_alerts_limit > 0),
  whatsapp_expiry_alerts_limit integer check (whatsapp_expiry_alerts_limit is null or whatsapp_expiry_alerts_limit > 0),
  ai_scan_monthly_limit integer not null check (ai_scan_monthly_limit > 0),
  job_search_access text not null check (job_search_access in ('limited', 'full')),
  updated_at timestamptz not null default now()
);

revoke all on table private.atsrs_personal_plan_entitlements
  from public, anon, authenticated;

insert into private.atsrs_personal_plan_entitlements (
  plan_key,
  public_name,
  tracked_documents_limit,
  storage_bytes_limit,
  profile_cv_limit,
  email_expiry_alerts_limit,
  whatsapp_expiry_alerts_limit,
  ai_scan_monthly_limit,
  job_search_access
) values
  ('free', 'Free', 10, 104857600, 1, null, 50, 5, 'limited'),
  ('pro', 'Bronze', 200, 1073741824, 3, null, 150, 15, 'full'),
  ('business', 'Business', 2000, null, 10, null, null, 500, 'full')
on conflict (plan_key) do update set
  public_name = excluded.public_name,
  tracked_documents_limit = excluded.tracked_documents_limit,
  storage_bytes_limit = excluded.storage_bytes_limit,
  profile_cv_limit = excluded.profile_cv_limit,
  email_expiry_alerts_limit = excluded.email_expiry_alerts_limit,
  whatsapp_expiry_alerts_limit = excluded.whatsapp_expiry_alerts_limit,
  ai_scan_monthly_limit = excluded.ai_scan_monthly_limit,
  job_search_access = excluded.job_search_access,
  updated_at = now();

create or replace function private.atsrs_personal_plan_key(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select subscription.plan
      from public.atsrs_subscriptions as subscription
     where subscription.user_id = p_user_id
       and subscription.status in ('active', 'trialing')
  ), 'free');
$$;

revoke all on function private.atsrs_personal_plan_key(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.atsrs_my_personal_entitlements()
returns table (
  plan_key text,
  plan_name text,
  tracked_documents_limit integer,
  storage_bytes_limit bigint,
  profile_cv_limit integer,
  email_expiry_alerts_limit integer,
  whatsapp_expiry_alerts_limit integer,
  ai_scan_monthly_limit integer,
  job_search_access text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    entitlement.plan_key,
    entitlement.public_name,
    entitlement.tracked_documents_limit,
    entitlement.storage_bytes_limit,
    entitlement.profile_cv_limit,
    entitlement.email_expiry_alerts_limit,
    entitlement.whatsapp_expiry_alerts_limit,
    entitlement.ai_scan_monthly_limit,
    entitlement.job_search_access
  from private.atsrs_personal_plan_entitlements as entitlement
  where entitlement.plan_key = private.atsrs_personal_plan_key((select auth.uid()))
    and (select auth.uid()) is not null;
$$;

revoke all on function public.atsrs_my_personal_entitlements()
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_my_personal_entitlements() to authenticated;

create or replace function public.atsrs_enforce_file_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_document_limit integer;
  v_storage_limit bigint;
  v_cv_limit integer;
  v_count integer;
  v_storage bigint;
  v_cv_count integer;
begin
  if new.account_type <> 'personal' then
    return new;
  end if;

  v_plan := private.atsrs_personal_plan_key(new.user_id);

  select
    entitlement.tracked_documents_limit,
    entitlement.storage_bytes_limit,
    entitlement.profile_cv_limit
    into v_document_limit, v_storage_limit, v_cv_limit
    from private.atsrs_personal_plan_entitlements as entitlement
   where entitlement.plan_key = v_plan;

  select count(*)::integer, coalesce(sum(file.size_bytes), 0)::bigint
    into v_count, v_storage
    from public.atsrs_files as file
   where file.user_id = new.user_id
     and file.account_type = 'personal';

  if v_count >= v_document_limit then
    raise exception 'ATSRS % plan tracked-document limit reached (% documents).',
      initcap(v_plan), v_document_limit using errcode = 'P0001';
  end if;

  if v_storage_limit is not null
     and v_storage + coalesce(new.size_bytes, 0) > v_storage_limit then
    raise exception 'ATSRS % plan storage limit reached.', initcap(v_plan)
      using errcode = 'P0001';
  end if;

  if new.category = 'cv' then
    select count(*)::integer
      into v_cv_count
      from public.atsrs_files as file
     where file.user_id = new.user_id
       and file.account_type = 'personal'
       and file.category = 'cv';

    if v_cv_count >= v_cv_limit then
      raise exception 'ATSRS % plan Profile CV limit reached (% CVs).',
        initcap(v_plan), v_cv_limit using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.atsrs_enforce_file_plan_limit()
  from public, anon, authenticated, service_role;

create or replace function public.atsrs_reserve_ai_scan(p_user_id uuid)
returns table (
  plan text,
  used integer,
  scan_limit integer,
  remaining integer,
  allowed boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_rows integer;
  v_period date := date_trunc('month', timezone('UTC', now()))::date;
begin
  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  v_plan := private.atsrs_personal_plan_key(p_user_id);
  select entitlement.ai_scan_monthly_limit
    into v_limit
    from private.atsrs_personal_plan_entitlements as entitlement
   where entitlement.plan_key = v_plan;

  insert into public.atsrs_ai_scan_usage as usage (
    user_id, period_start, scan_count, updated_at
  ) values (
    p_user_id, v_period, 1, now()
  )
  on conflict (user_id, period_start) do update
     set scan_count = usage.scan_count + 1,
         updated_at = now()
   where usage.scan_count < v_limit
     and usage.updated_at <= now() - interval '8 seconds'
  returning scan_count into v_used;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select usage.scan_count
      into v_used
      from public.atsrs_ai_scan_usage as usage
     where usage.user_id = p_user_id
       and usage.period_start = v_period;

    return query select
      v_plan,
      coalesce(v_used, 0),
      v_limit,
      greatest(v_limit - coalesce(v_used, 0), 0),
      false,
      case when coalesce(v_used, 0) >= v_limit then 'monthly_limit' else 'cooldown' end;
    return;
  end if;

  return query select
    v_plan,
    v_used,
    v_limit,
    greatest(v_limit - v_used, 0),
    true,
    'reserved'::text;
end;
$$;

revoke all on function public.atsrs_reserve_ai_scan(uuid)
  from public, anon, authenticated;
grant execute on function public.atsrs_reserve_ai_scan(uuid) to service_role;

create or replace function private.atsrs_enforce_personal_whatsapp_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
begin
  if new.channel <> 'whatsapp' or new.account_type <> 'personal' then
    return new;
  end if;

  v_plan := private.atsrs_personal_plan_key(new.user_id);
  select entitlement.whatsapp_expiry_alerts_limit
    into v_limit
    from private.atsrs_personal_plan_entitlements as entitlement
   where entitlement.plan_key = v_plan;

  if v_limit is null then
    return new;
  end if;

  select count(*)::integer
    into v_used
    from public.atsrs_notification_outbox as outbox
   where outbox.user_id = new.user_id
     and outbox.account_type = 'personal'
     and outbox.channel = 'whatsapp'
     and outbox.created_at >= date_trunc('month', timezone('UTC', now()));

  if v_used >= v_limit then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function private.atsrs_enforce_personal_whatsapp_limit()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_personal_whatsapp_plan_limit
  on public.atsrs_notification_outbox;
create trigger atsrs_personal_whatsapp_plan_limit
before insert on public.atsrs_notification_outbox
for each row execute function private.atsrs_enforce_personal_whatsapp_limit();

-- Public Job Search reads through entitlement-aware RPCs. The underlying table
-- remains directly readable only by Jobs administrators, so Free users cannot
-- recover premium contact/source fields with a custom REST query.
drop policy if exists atsrs_jobs_anon_read_live on public.atsrs_jobs;
drop policy if exists atsrs_jobs_authenticated_read on public.atsrs_jobs;
create policy atsrs_jobs_admin_read
on public.atsrs_jobs
for select
to authenticated
using ((select atsrs_private.is_jobs_admin()));

revoke select on table public.atsrs_jobs from anon;

create or replace function public.atsrs_jobs_feed(
  p_page integer default 1,
  p_page_size integer default 30,
  p_search_terms text[] default '{}'::text[],
  p_role text default null,
  p_location text default null,
  p_company text default null,
  p_recruiter text default null,
  p_days integer default 0,
  p_worksites text[] default '{}'::text[],
  p_new_only boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_full boolean := false;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 30), 1), 30);
  v_total integer := 0;
  v_jobs jsonb := '[]'::jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');

  with available as materialized (
    select job.*
      from public.atsrs_jobs as job
     where job.status = 'published'
       and job.published_at is not null
       and job.published_at <= case when v_full then now() else now() - interval '6 hours' end
       and (job.expires_at is null or job.expires_at > now())
     order by job.updated_at desc, job.id desc
     limit case when v_full then null else 30 end
  ), filtered as materialized (
    select job.*
      from available as job
     where (coalesce(p_role, '') = '' or job.title = p_role)
       and (coalesce(p_location, '') = '' or job.location = p_location)
       and (coalesce(p_company, '') = '' or job.company = p_company or job.recruiter_company = p_company)
       and (coalesce(p_recruiter, '') = '' or job.recruiter_name = p_recruiter)
       and (
         coalesce(array_length(p_search_terms, 1), 0) = 0
         or not exists (
           select 1
             from unnest(p_search_terms) as search_term
            where job.title not ilike '%' || search_term || '%'
         )
       )
       and (
         coalesce(p_days, 0) <= 0
         or coalesce(job.source_posted_at, job.display_posted_date, job.published_at::date)
              >= (timezone('UTC', now())::date - p_days)
       )
       and (
         coalesce(array_length(p_worksites, 1), 0) = 0
         or job.worksite = any(p_worksites)
       )
       and (not coalesce(p_new_only, false) or job.published_at >= now() - interval '6 hours')
  ), page_rows as (
    select job.*
      from filtered as job
     order by job.updated_at desc, job.id desc
     offset ((v_page - 1) * v_page_size)
     limit v_page_size
  )
  select
    (select count(*)::integer from filtered),
    coalesce((
      select jsonb_agg(
        case when v_full then to_jsonb(job)
        else to_jsonb(job)
          - 'recruiter_name'
          - 'recruiter_company'
          - 'recruiter_phone'
          - 'recruiter_email'
          - 'source_url'
          - 'application_url'
        end
        order by job.updated_at desc, job.id desc
      )
      from page_rows as job
    ), '[]'::jsonb)
    into v_total, v_jobs;

  return jsonb_build_object(
    'access', case when v_full then 'full' else 'limited' end,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'jobs', v_jobs
  );
end;
$$;

revoke all on function public.atsrs_jobs_feed(integer, integer, text[], text, text, text, text, integer, text[], boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed(integer, integer, text[], text, text, text, text, integer, text[], boolean)
  to anon, authenticated;

create or replace function public.atsrs_jobs_facets()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_full boolean := false;
  v_rows jsonb := '[]'::jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', job.id,
      'title', job.title,
      'location', job.location,
      'company', job.company,
      'recruiter_company', case when v_full then job.recruiter_company else null end,
      'recruiter_name', case when v_full then job.recruiter_name else null end,
      'worksite', job.worksite
    ) order by job.title, job.id
  ), '[]'::jsonb)
    into v_rows
    from (
      select vacancy.*
        from public.atsrs_jobs as vacancy
       where vacancy.status = 'published'
         and vacancy.published_at is not null
         and vacancy.published_at <= case when v_full then now() else now() - interval '6 hours' end
         and (vacancy.expires_at is null or vacancy.expires_at > now())
       order by vacancy.updated_at desc, vacancy.id desc
       limit case when v_full then null else 30 end
    ) as job;

  return v_rows;
end;
$$;

revoke all on function public.atsrs_jobs_facets()
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_facets() to anon, authenticated;

commit;

