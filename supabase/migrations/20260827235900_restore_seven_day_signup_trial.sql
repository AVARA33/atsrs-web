-- Restore the intended one-time seven-day Personal trial.

update public.atsrs_subscriptions
   set trial_ends_at = trial_started_at + interval '7 days',
       updated_at = now()
 where status = 'trialing'
   and trial_started_at is not null
   and trial_ends_at is distinct from trial_started_at + interval '7 days';

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

  insert into private.atsrs_signup_trial_claims (email_fingerprint, first_user_id, granted_at)
  values (v_fingerprint, new.id, v_started_at)
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
     set plan = 'business', status = 'trialing',
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
