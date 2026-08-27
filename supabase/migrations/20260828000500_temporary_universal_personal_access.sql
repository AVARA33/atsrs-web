-- Trial-free temporary launch mode: every authenticated Personal account has
-- full Business/Titan entitlements until the owner re-enables plan limits.

drop trigger if exists atsrs_grant_verified_signup_trial_on_insert on auth.users;
drop trigger if exists atsrs_grant_verified_signup_trial_on_confirmation on auth.users;

update public.atsrs_subscriptions
   set plan = 'business',
       status = 'active',
       trial_started_at = null,
       trial_ends_at = null,
       updated_at = now()
 where status = 'trialing';

create or replace function private.atsrs_personal_plan_key(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_user_id is null then 'free' else 'business' end;
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
  select false, null::text, null::timestamptz, null::timestamptz, 0::bigint
  where (select auth.uid()) is not null;
$$;

revoke all on function public.atsrs_my_personal_trial()
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_my_personal_trial() to authenticated;
