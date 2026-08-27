-- Owner-only detail rows for the internal Developer registration view.
create or replace function public.atsrs_get_developer_registrations()
returns table (
  email text,
  registered_at timestamptz,
  last_sign_in_at timestamptz,
  workspace_ready boolean,
  access_status text,
  plan_key text,
  trial_ends_at timestamptz,
  days_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_is_admin boolean;
  v_has_aal2 boolean;
begin
  if to_regprocedure('atsrs_private.atsrs_request_has_aal2()') is not null then
    execute 'select atsrs_private.atsrs_request_has_aal2()' into v_has_aal2;
    if not coalesce(v_has_aal2, false) then
      raise exception using errcode = '42501', message = 'ATSRS_AAL2_REQUIRED';
    end if;
  end if;

  v_is_admin := exists (
    select 1
    from public.atsrs_admin_users as admin_user
    where admin_user.user_id = auth.uid()
  );
  if not v_is_admin then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;

  return query
  select
    auth_user.email::text,
    auth_user.created_at,
    auth_user.last_sign_in_at,
    exists (
      select 1
      from public.atsrs_workspaces as workspace
      where workspace.user_id = auth_user.id
        and workspace.account_type = 'personal'
    ),
    case
      when subscription.status = 'trialing' and subscription.trial_ends_at > now() then 'trial'
      when subscription.status = 'trialing' then 'expired'
      when subscription.status = 'active' then 'full'
      else 'free'
    end,
    case
      when subscription.status = 'trialing' and subscription.trial_ends_at <= now() then 'free'
      else coalesce(subscription.plan, 'free')
    end,
    case when subscription.status = 'trialing' then subscription.trial_ends_at else null end,
    case
      when subscription.status = 'trialing' and subscription.trial_ends_at > now()
        then greatest(0, ceil(extract(epoch from (subscription.trial_ends_at - now())) / 86400.0)::integer)
      when subscription.status = 'trialing' then 0
      else null
    end
  from auth.users as auth_user
  left join public.atsrs_subscriptions as subscription
    on subscription.user_id = auth_user.id
  where auth_user.deleted_at is null
    and not coalesce(auth_user.is_anonymous, false)
    and auth_user.email_confirmed_at is not null
    and exists (
      select 1 from auth.identities as identity where identity.user_id = auth_user.id
    )
    and not coalesce(
      auth_user.raw_app_meta_data @> '{"atsrs_metrics_excluded": true}'::jsonb,
      false
    )
  order by auth_user.created_at desc;
end
$function$;

revoke all on function public.atsrs_get_developer_registrations() from public, anon;
grant execute on function public.atsrs_get_developer_registrations() to authenticated;
