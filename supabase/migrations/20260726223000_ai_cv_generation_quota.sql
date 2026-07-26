-- ATSRS AI CV allowance.
-- Default accounts receive one lifetime welcome generation.
-- The current "pro" database plan is the paid Personal tier presented as Titanium.

begin;

create table if not exists public.atsrs_ai_cv_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  generation_count integer not null default 0 check (generation_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.atsrs_ai_cv_usage enable row level security;
revoke all on table public.atsrs_ai_cv_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.atsrs_ai_cv_usage to service_role;

create or replace function public.atsrs_reserve_ai_cv(p_user_id uuid)
returns table (
  plan text,
  used integer,
  generation_limit integer,
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
  v_period date;
begin
  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  select subscription.plan
    into v_plan
    from public.atsrs_subscriptions as subscription
   where subscription.user_id = p_user_id
     and subscription.status in ('active', 'trialing');

  v_plan := coalesce(v_plan, 'free');
  v_limit := case v_plan
    when 'business' then 10
    when 'pro' then 3
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

revoke all on function public.atsrs_reserve_ai_cv(uuid) from public, anon, authenticated;
grant execute on function public.atsrs_reserve_ai_cv(uuid) to service_role;

create or replace function public.atsrs_release_ai_cv(p_user_id uuid, p_period_start date)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.atsrs_ai_cv_usage
     set generation_count = greatest(generation_count - 1, 0),
         updated_at = now() - interval '15 seconds'
   where user_id = p_user_id
     and period_start = p_period_start;
$$;

revoke all on function public.atsrs_release_ai_cv(uuid, date) from public, anon, authenticated;
grant execute on function public.atsrs_release_ai_cv(uuid, date) to service_role;

commit;
