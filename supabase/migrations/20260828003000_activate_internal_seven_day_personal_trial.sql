-- Start a private, per-account seven-day full-access window for new verified
-- Personal registrations. Existing accounts keep their current active plan.
-- No trial messaging is exposed by the public website.
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
  if v_fingerprint is null then return new; end if;

  insert into private.atsrs_signup_trial_claims (
    email_fingerprint, first_user_id, granted_at
  ) values (
    v_fingerprint, new.id, v_started_at
  )
  on conflict (email_fingerprint) do nothing
  returning email_fingerprint into v_claimed;
  if v_claimed is null then return new; end if;

  insert into public.atsrs_subscriptions as subscription (
    user_id, plan, status, trial_started_at, trial_ends_at, created_at, updated_at
  ) values (
    new.id, 'business', 'trialing', v_started_at,
    v_started_at + interval '7 days', v_started_at, v_started_at
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
