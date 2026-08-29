-- Free includes one AI Document Scan for the lifetime of the account.
-- Paid Personal plans retain their existing monthly allowances.

begin;

update private.atsrs_personal_plan_entitlements
   set ai_scan_monthly_limit = 1,
       updated_at = now()
 where plan_key = 'free';

-- A Free user who scanned in any previous month has already consumed the
-- lifetime allowance. Collapse that history into the non-resetting period.
insert into public.atsrs_ai_scan_usage (user_id, period_start, scan_count, updated_at)
select usage.user_id, date '1970-01-01', 1, now()
  from public.atsrs_ai_scan_usage as usage
 where private.atsrs_personal_plan_key(usage.user_id) = 'free'
 group by usage.user_id
having sum(usage.scan_count) > 0
on conflict (user_id, period_start) do update
   set scan_count = greatest(public.atsrs_ai_scan_usage.scan_count, 1),
       updated_at = now();

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
  v_period date;
begin
  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  v_plan := private.atsrs_personal_plan_key(p_user_id);
  select entitlement.ai_scan_monthly_limit
    into v_limit
    from private.atsrs_personal_plan_entitlements as entitlement
   where entitlement.plan_key = v_plan;

  v_period := case
    when v_plan = 'free' then date '1970-01-01'
    else date_trunc('month', timezone('UTC', now()))::date
  end;

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
      case
        when coalesce(v_used, 0) >= v_limit and v_plan = 'free' then 'lifetime_limit'
        when coalesce(v_used, 0) >= v_limit then 'monthly_limit'
        else 'cooldown'
      end;
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

commit;
