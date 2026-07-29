-- ATSRS V262: launch-plan quotas for stored files and AI document scans.
-- Existing beta accounts receive Pro limits; accounts created later start on Free.

begin;

create table if not exists public.atsrs_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atsrs_ai_scan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  scan_count integer not null default 0 check (scan_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.atsrs_subscriptions enable row level security;
alter table public.atsrs_ai_scan_usage enable row level security;

drop policy if exists "Users can view their own ATSRS subscription"
  on public.atsrs_subscriptions;
create policy "Users can view their own ATSRS subscription"
  on public.atsrs_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own ATSRS AI usage"
  on public.atsrs_ai_scan_usage;
create policy "Users can view their own ATSRS AI usage"
  on public.atsrs_ai_scan_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.atsrs_subscriptions from anon, authenticated;
revoke all on table public.atsrs_ai_scan_usage from anon, authenticated;
grant select on table public.atsrs_subscriptions to authenticated;
grant select on table public.atsrs_ai_scan_usage to authenticated;
grant select, insert, update, delete on table public.atsrs_subscriptions to service_role;
grant select, insert, update, delete on table public.atsrs_ai_scan_usage to service_role;

-- Called with the signed-in user's JWT. It accepts no user id, preventing one user
-- from reserving or inspecting another user's allowance.
create or replace function public.atsrs_reserve_ai_scan()
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
  v_user_id uuid := auth.uid();
  v_plan text;
  v_limit integer;
  v_used integer;
  v_rows integer;
  v_period date := date_trunc('month', timezone('UTC', now()))::date;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select s.plan
    into v_plan
    from public.atsrs_subscriptions as s
   where s.user_id = v_user_id
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
    v_user_id,
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
     where usage.user_id = v_user_id
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

revoke all on function public.atsrs_reserve_ai_scan() from public, anon;
grant execute on function public.atsrs_reserve_ai_scan() to authenticated;

-- Enforce the published stored-file allowance at the database boundary.
create or replace function public.atsrs_enforce_file_plan_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  select s.plan
    into v_plan
    from public.atsrs_subscriptions as s
   where s.user_id = new.user_id
     and s.status in ('active', 'trialing');

  v_plan := coalesce(v_plan, 'free');
  v_limit := case v_plan
    when 'business' then 2000
    when 'pro' then 200
    else 20
  end;

  select count(*)::integer
    into v_count
    from public.atsrs_files as f
   where f.user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'ATSRS % plan stored-file limit reached (% files).', initcap(v_plan), v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists atsrs_files_plan_limit on public.atsrs_files;
create trigger atsrs_files_plan_limit
before insert on public.atsrs_files
for each row execute function public.atsrs_enforce_file_plan_limit();

revoke all on function public.atsrs_enforce_file_plan_limit() from public, anon, authenticated;

-- Preserve a generous beta allowance for accounts that already existed at launch.
insert into public.atsrs_subscriptions (user_id, plan, status)
select id, 'pro', 'active'
from auth.users
on conflict (user_id) do nothing;

commit;

;
