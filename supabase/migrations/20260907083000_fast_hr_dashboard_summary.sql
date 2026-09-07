begin;

create index if not exists atsrs_job_ai_calls_run_created_idx
  on public.atsrs_job_ai_calls (run_id, created_at);
create index if not exists atsrs_job_ingestion_runs_scope_started_idx
  on public.atsrs_job_ingestion_runs (billing_scope, started_at);
create index if not exists atsrs_recruiters_source_created_idx
  on public.atsrs_recruiters (source, created_at);
create index if not exists atsrs_hr_companies_verified_idx
  on public.atsrs_hr_companies (verified_at);

-- A read-only, owner-gated projection for the Developer page.  This deliberately
-- avoids the legacy overview RPC, which calculates and serializes fields that the
-- page never renders.  HR ingestion tables and write paths are unchanged.
create or replace function public.atsrs_get_hr_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_has_aal2 boolean;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
  v_config public.atsrs_job_ingestion_config%rowtype;
  v_balance jsonb;
  v_daily jsonb;
  v_month_cost numeric := 0;
  v_unresolved numeric := 0;
  v_coverage jsonb;
begin
  if to_regprocedure('atsrs_private.atsrs_request_has_aal2()') is not null then
    execute 'select atsrs_private.atsrs_request_has_aal2()' into v_has_aal2;
    if not coalesce(v_has_aal2, false) then
      raise exception using errcode = '42501', message = 'ATSRS_AAL2_REQUIRED';
    end if;
  end if;
  if not exists (
    select 1 from public.atsrs_admin_users a where a.user_id = (select auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;

  select * into v_config from public.atsrs_job_ingestion_config where id = true;
  select jsonb_build_object(
    'amount_usd', amount_usd, 'checked_at', checked_at,
    'source', source, 'live', false
  ) into v_balance from public.atsrs_api_balance_snapshot where id = true;

  select
    coalesce(sum(c.cost_usd), 0),
    coalesce(sum(c.reserved_usd) filter (where c.state = 'reserved'), 0)
  into v_month_cost, v_unresolved
  from public.atsrs_job_ai_calls c
  join public.atsrs_job_ingestion_runs r on r.id = c.run_id
  where r.billing_scope = 'hr_management' and c.created_at >= v_month_start;

  with days as (
    select (now() at time zone 'Asia/Baku')::date - n as day
    from generate_series(0, 29) n
  ), calls as (
    select (c.created_at at time zone 'Asia/Baku')::date as day,
      coalesce(sum(c.cost_usd), 0) as cost,
      coalesce(sum(c.reserved_usd) filter (where c.state = 'reserved'), 0) as reserved,
      count(*) as calls
    from public.atsrs_job_ai_calls c
    join public.atsrs_job_ingestion_runs r on r.id = c.run_id
    where r.billing_scope = 'hr_management'
      and c.created_at >= v_day_start - interval '29 days'
      and c.created_at < v_day_start + interval '1 day'
    group by 1
  ), runs as (
    select (started_at at time zone 'Asia/Baku')::date as day,
      coalesce(sum(published), 0) as published,
      coalesce(sum(updated), 0) as updated,
      count(*) filter (where status in ('failed', 'partial')) as errors
    from public.atsrs_job_ingestion_runs
    where billing_scope = 'hr_management'
      and started_at >= v_day_start - interval '29 days'
      and started_at < v_day_start + interval '1 day'
    group by 1
  ), recruiters as (
    select (created_at at time zone 'Asia/Baku')::date as day, count(*) as added
    from public.atsrs_recruiters
    where source = 'official_job_contact'
      and created_at >= v_day_start - interval '29 days'
      and created_at < v_day_start + interval '1 day'
    group by 1
  ), companies as (
    select (verified_at at time zone 'Asia/Baku')::date as day, count(*) as added
    from public.atsrs_hr_companies
    where verified_at >= v_day_start - interval '29 days'
      and verified_at < v_day_start + interval '1 day'
    group by 1
  )
  select jsonb_agg(jsonb_build_object(
    'day', d.day,
    'daily_limit', case when b.day is not null then b.daily_limit when d.day = (now() at time zone 'Asia/Baku')::date then v_config.daily_limit else null end,
    'cost', coalesce(c.cost, 0),
    'reserved', coalesce(c.reserved, 0),
    'remaining', case when b.day is not null or d.day = (now() at time zone 'Asia/Baku')::date
      then greatest(0, coalesce(b.daily_limit, v_config.daily_limit) - coalesce(c.cost, 0) - coalesce(c.reserved, 0)) else null end,
    'calls', coalesce(c.calls, 0),
    'published', coalesce(r.published, 0),
    'updated', coalesce(r.updated, 0),
    'recruiters_added', coalesce(rec.added, 0),
    'companies_added', coalesce(co.added, 0),
    'paused_at', b.first_paused_at,
    'pause_reason', b.pause_reason,
    'errors', coalesce(r.errors, 0)
  ) order by d.day desc)
  into v_daily
  from days d
  left join calls c using (day)
  left join runs r using (day)
  left join recruiters rec using (day)
  left join companies co using (day)
  left join public.atsrs_hr_budget_days b using (day);

  select jsonb_build_object(
    'scope', (select coalesce(jsonb_agg(to_jsonb(s) order by name), '[]'::jsonb) from public.atsrs_hr_source_scope s),
    'sources', (select coalesce(jsonb_agg(to_jsonb(s) order by board), '[]'::jsonb) from public.atsrs_job_sources s),
    'pending', (select count(*) from public.atsrs_job_ingestion_queue where state = 'pending'),
    'review', (select count(*) from public.atsrs_job_ingestion_queue where state = 'review')
  ) into v_coverage;

  return jsonb_build_object(
    'enabled', v_config.enabled,
    'monthly_limit', v_config.monthly_limit,
    'daily_limit', v_config.daily_limit,
    'today_cost', coalesce((v_daily->0->>'cost')::numeric, 0),
    'today_reserved', coalesce((v_daily->0->>'reserved')::numeric, 0),
    'daily_remaining', coalesce((v_daily->0->>'remaining')::numeric, v_config.daily_limit),
    'month_cost', v_month_cost,
    'unresolved_reserve', v_unresolved,
    'daily_budget_paused', coalesce((v_daily->0->>'cost')::numeric, 0) + coalesce((v_daily->0->>'reserved')::numeric, 0) + 0.02 > v_config.daily_limit,
    'reservation_per_call', 0.02,
    'daily_reset_at', ((now() at time zone 'Asia/Baku')::date + 1)::timestamp at time zone 'Asia/Baku',
    'today_recruiters_added', coalesce((v_daily->0->>'recruiters_added')::bigint, 0),
    'today_companies_added', coalesce((v_daily->0->>'companies_added')::bigint, 0),
    'balance', v_balance,
    'daily', v_daily,
    'coverage', v_coverage,
    'refreshed_at', now(),
    'scan_cost', null
  );
end
$function$;

revoke all on function public.atsrs_get_hr_dashboard_summary() from public, anon;
grant execute on function public.atsrs_get_hr_dashboard_summary() to authenticated;

commit;
