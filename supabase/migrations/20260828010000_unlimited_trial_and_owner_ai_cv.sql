-- Trial users receive the full product experience, and the ATSRS owner must not
-- be blocked by customer-plan CV generation quotas while operating the product.
create or replace function public.atsrs_reserve_ai_cv(p_user_id uuid)
returns table(
  plan text,
  used integer,
  generation_limit integer,
  remaining integer,
  allowed boolean,
  reason text
)
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_rows integer;
  v_period date;
  v_unlimited boolean;
begin
  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  v_plan := private.atsrs_personal_plan_key(p_user_id);
  v_unlimited :=
    exists (
      select 1
        from public.atsrs_admin_users as admin_user
       where admin_user.user_id = p_user_id
    )
    or exists (
      select 1
        from public.atsrs_subscriptions as subscription
       where subscription.user_id = p_user_id
         and subscription.status = 'trialing'
         and subscription.trial_ends_at > now()
    );

  -- Keep the anti-double-click cooldown for unlimited accounts while making the
  -- practical monthly ceiling unreachable.
  v_limit := case
    when v_unlimited then 2147483647
    when v_plan = 'business' then 10
    when v_plan = 'pro' then 3
    else 1
  end;
  v_period := case
    when v_plan = 'free' then date '1970-01-01'
    else date_trunc('month', timezone('UTC', now()))::date
  end;

  insert into public.atsrs_ai_cv_usage as usage (
    user_id,
    period_start,
    generation_count,
    updated_at
  ) values (
    p_user_id,
    v_period,
    1,
    now()
  )
  on conflict (user_id, period_start) do update
     set generation_count = usage.generation_count + 1,
         updated_at = now()
   where usage.generation_count < v_limit
     and usage.updated_at <= now() - interval '15 seconds'
  returning generation_count into v_used;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select usage.generation_count
      into v_used
      from public.atsrs_ai_cv_usage as usage
     where usage.user_id = p_user_id
       and usage.period_start = v_period;

    return query select
      v_plan,
      coalesce(v_used, 0),
      v_limit,
      greatest(v_limit - coalesce(v_used, 0), 0),
      false,
      case
        when coalesce(v_used, 0) >= v_limit then 'generation_limit'
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

revoke all on function public.atsrs_reserve_ai_cv(uuid)
  from public, anon, authenticated;
grant execute on function public.atsrs_reserve_ai_cv(uuid) to service_role;

