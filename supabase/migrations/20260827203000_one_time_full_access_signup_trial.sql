-- Give each verified email address one seven-day TITAN Personal trial.
-- The private fingerprint ledger intentionally survives account deletion so the
-- same mailbox cannot obtain another trial by registering again.

begin;

alter table public.atsrs_subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

alter table public.atsrs_subscriptions
  drop constraint if exists atsrs_subscriptions_trial_window_check;
alter table public.atsrs_subscriptions
  add constraint atsrs_subscriptions_trial_window_check check (
    (trial_started_at is null and trial_ends_at is null)
    or (trial_started_at is not null and trial_ends_at > trial_started_at)
  );

create index if not exists atsrs_subscriptions_active_trial_idx
  on public.atsrs_subscriptions (trial_ends_at)
  where status = 'trialing';

create table if not exists private.atsrs_signup_trial_claims (
  email_fingerprint text primary key
    check (email_fingerprint ~ '^[0-9a-f]{64}$'),
  first_user_id uuid not null,
  granted_at timestamptz not null default now()
);

comment on table private.atsrs_signup_trial_claims is
  'Non-reversible verified-email fingerprints used only to prevent repeat signup trials after account deletion.';

revoke all on table private.atsrs_signup_trial_claims
  from public, anon, authenticated, service_role;

create or replace function private.atsrs_signup_trial_email_fingerprint(p_email text)
returns text
language plpgsql
immutable
strict
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_local text;
  v_domain text;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+$' then
    return null;
  end if;

  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  -- Gmail treats dots and +tags as aliases of the same mailbox. Canonicalising
  -- them prevents a second trial through an alternate spelling of one Gmail.
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(split_part(v_local, '+', 1), '.', '');
    v_domain := 'gmail.com';
  end if;

  return encode(extensions.digest(v_local || '@' || v_domain, 'sha256'), 'hex');
end;
$$;

revoke all on function private.atsrs_signup_trial_email_fingerprint(text)
  from public, anon, authenticated, service_role;

create or replace function private.atsrs_grant_verified_signup_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fingerprint text;
  v_claimed text;
  v_started_at timestamptz := now();
begin
  if new.email_confirmed_at is null or nullif(btrim(new.email), '') is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;

  v_fingerprint := private.atsrs_signup_trial_email_fingerprint(new.email);
  if v_fingerprint is null then
    return new;
  end if;

  insert into private.atsrs_signup_trial_claims (
    email_fingerprint,
    first_user_id,
    granted_at
  ) values (
    v_fingerprint,
    new.id,
    v_started_at
  )
  on conflict (email_fingerprint) do nothing
  returning email_fingerprint into v_claimed;

  -- No returned claim means this verified mailbox already used its trial.
  if v_claimed is null then
    return new;
  end if;

  insert into public.atsrs_subscriptions as subscription (
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    created_at,
    updated_at
  ) values (
    new.id,
    'business',
    'trialing',
    v_started_at,
    v_started_at + interval '7 days',
    v_started_at,
    v_started_at
  )
  on conflict (user_id) do update
     set plan = 'business',
         status = 'trialing',
         trial_started_at = excluded.trial_started_at,
         trial_ends_at = excluded.trial_ends_at,
         updated_at = excluded.updated_at
   where subscription.plan = 'free'
     and subscription.status = 'active'
     and subscription.trial_started_at is null;

  return new;
end;
$$;

revoke all on function private.atsrs_grant_verified_signup_trial()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_grant_verified_signup_trial_on_insert on auth.users;
create trigger atsrs_grant_verified_signup_trial_on_insert
after insert on auth.users
for each row execute function private.atsrs_grant_verified_signup_trial();

drop trigger if exists atsrs_grant_verified_signup_trial_on_confirmation on auth.users;
create trigger atsrs_grant_verified_signup_trial_on_confirmation
after update of email_confirmed_at on auth.users
for each row execute function private.atsrs_grant_verified_signup_trial();

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
       and (
         subscription.status = 'active'
         or (
           subscription.status = 'trialing'
           and subscription.trial_ends_at > now()
         )
       )
  ), 'free');
$$;

revoke all on function private.atsrs_personal_plan_key(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.atsrs_my_personal_trial()
returns table (
  is_trial boolean,
  plan_name text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  seconds_remaining bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(subscription.status = 'trialing' and subscription.trial_ends_at > now(), false),
    case
      when subscription.status = 'trialing' and subscription.trial_ends_at > now()
        then entitlement.public_name
      else null
    end,
    case when subscription.status = 'trialing' then subscription.trial_started_at else null end,
    case when subscription.status = 'trialing' then subscription.trial_ends_at else null end,
    case
      when subscription.status = 'trialing' and subscription.trial_ends_at > now()
        then greatest(0, floor(extract(epoch from (subscription.trial_ends_at - now())))::bigint)
      else 0::bigint
    end
  from (select 1) as seed
  left join public.atsrs_subscriptions as subscription
    on subscription.user_id = (select auth.uid())
  left join private.atsrs_personal_plan_entitlements as entitlement
    on entitlement.plan_key = subscription.plan
  where (select auth.uid()) is not null;
$$;

revoke all on function public.atsrs_my_personal_trial()
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_my_personal_trial() to authenticated;

-- Keep AI CV reservations on the same time-aware plan source as every other
-- Personal entitlement. An expired trial therefore cannot retain paid limits.
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

  v_plan := private.atsrs_personal_plan_key(p_user_id);
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

revoke all on function public.atsrs_reserve_ai_cv(uuid)
  from public, anon, authenticated;
grant execute on function public.atsrs_reserve_ai_cv(uuid) to service_role;

commit;
