-- ATSRS V262: only the authenticated Edge Function may reserve paid AI capacity.

begin;

drop function if exists public.atsrs_reserve_ai_scan();

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
security invoker
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

  select s.plan
    into v_plan
    from public.atsrs_subscriptions as s
   where s.user_id = p_user_id
     and s.status in ('active', 'trialing');

  v_plan := coalesce(v_plan, 'free');
  v_limit := case v_plan
    when 'business' then 500
    when 'pro' then 100
    else 5
  end;

  insert into public.atsrs_ai_scan_usage as usage (
    user_id,
    period_start,
    scan_count,
    updated_at
  ) values (
    p_user_id,
    v_period,
    1,
    now()
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

revoke all on function public.atsrs_reserve_ai_scan(uuid) from public, anon, authenticated;
grant execute on function public.atsrs_reserve_ai_scan(uuid) to service_role;

commit;
