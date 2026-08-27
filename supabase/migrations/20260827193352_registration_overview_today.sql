-- Add an owner-only count for registrations created during the current Baku calendar day.
begin;

drop function if exists public.atsrs_get_registration_overview();

create function public.atsrs_get_registration_overview()
returns table (
  is_admin boolean,
  registered_users bigint,
  new_users_today bigint,
  new_users_7d bigint,
  new_users_14d bigint,
  new_users_30d bigint
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
    where admin_user.user_id = (select auth.uid())
  );

  if not v_is_admin then
    return query
      select false, null::bigint, null::bigint, null::bigint, null::bigint, null::bigint;
    return;
  end if;

  return query
    with valid_users as (
      select auth_user.id, auth_user.created_at
      from auth.users as auth_user
      where auth_user.deleted_at is null
        and not coalesce(auth_user.is_anonymous, false)
        and (
          auth_user.email_confirmed_at is not null
          or auth_user.phone_confirmed_at is not null
        )
        and exists (
          select 1
          from auth.identities as identity
          where identity.user_id = auth_user.id
        )
        and not coalesce(
          auth_user.raw_app_meta_data @> '{"atsrs_metrics_excluded": true}'::jsonb,
          false
        )
    ),
    boundaries as (
      select date_trunc('day', now() at time zone 'Asia/Baku') at time zone 'Asia/Baku' as today_start
    )
    select
      true,
      count(*)::bigint,
      count(*) filter (
        where valid_users.created_at >= boundaries.today_start
      )::bigint,
      count(*) filter (
        where valid_users.created_at >= now() - interval '7 days'
      )::bigint,
      count(*) filter (
        where valid_users.created_at >= now() - interval '14 days'
      )::bigint,
      count(*) filter (
        where valid_users.created_at >= now() - interval '30 days'
      )::bigint
    from valid_users
    cross join boundaries;
end
$function$;

revoke all on function public.atsrs_get_registration_overview() from public, anon;
grant execute on function public.atsrs_get_registration_overview() to authenticated;

commit;
