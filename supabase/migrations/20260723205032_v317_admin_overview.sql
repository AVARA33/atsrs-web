begin;

create table if not exists public.atsrs_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.atsrs_admin_users enable row level security;
revoke all on table public.atsrs_admin_users from anon, authenticated;

-- Admin membership is operational configuration. Provision it explicitly in each
-- environment after the target auth user has been verified; never commit a user UUID.

create table if not exists public.atsrs_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'scan_document',
  model text not null,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(14, 8) not null default 0 check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists atsrs_ai_usage_created_at_idx
  on public.atsrs_ai_usage (created_at desc);

alter table public.atsrs_ai_usage enable row level security;
revoke all on table public.atsrs_ai_usage from anon, authenticated;

create table if not exists public.atsrs_admin_billing_config (
  id boolean primary key default true check (id),
  purchased_credit_usd numeric(12, 2) not null default 5.00,
  baseline_spend_usd numeric(12, 4) not null default 0.0700,
  baseline_recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.atsrs_admin_billing_config enable row level security;
revoke all on table public.atsrs_admin_billing_config from anon, authenticated;

insert into public.atsrs_admin_billing_config (
  id,
  purchased_credit_usd,
  baseline_spend_usd,
  baseline_recorded_at,
  updated_at
)
values (true, 5.00, 0.0700, now(), now())
on conflict (id) do nothing;

create or replace function public.atsrs_get_admin_overview()
returns table (
  is_admin boolean,
  registered_users bigint,
  new_users_30d bigint,
  purchased_credit_usd numeric,
  estimated_spend_usd numeric,
  estimated_credit_usd numeric,
  tracked_scans bigint,
  metrics_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_credit numeric;
  v_baseline_spend numeric;
  v_baseline_at timestamptz;
  v_usage_cost numeric;
  v_tracked_scans bigint;
  v_latest_usage timestamptz;
begin
  v_is_admin := exists (
    select 1
    from public.atsrs_admin_users au
    where au.user_id = auth.uid()
  );

  if not v_is_admin then
    return query
      select false, null::bigint, null::bigint, null::numeric, null::numeric,
        null::numeric, null::bigint, null::timestamptz;
    return;
  end if;

  select
    c.purchased_credit_usd,
    c.baseline_spend_usd,
    c.baseline_recorded_at
  into v_credit, v_baseline_spend, v_baseline_at
  from public.atsrs_admin_billing_config c
  where c.id = true;

  select
    coalesce(sum(u.estimated_cost_usd), 0),
    count(*),
    max(u.created_at)
  into v_usage_cost, v_tracked_scans, v_latest_usage
  from public.atsrs_ai_usage u
  where u.created_at >= v_baseline_at;

  return query
    select
      true,
      (select count(*) from auth.users)::bigint,
      (select count(*) from auth.users where created_at >= now() - interval '30 days')::bigint,
      v_credit,
      round(v_baseline_spend + v_usage_cost, 4),
      greatest(0, round(v_credit - v_baseline_spend - v_usage_cost, 4)),
      v_tracked_scans,
      greatest(
        v_baseline_at,
        coalesce(v_latest_usage, v_baseline_at)
      );
end;
$$;

revoke all on function public.atsrs_get_admin_overview() from public, anon;
grant execute on function public.atsrs_get_admin_overview() to authenticated;

commit;
