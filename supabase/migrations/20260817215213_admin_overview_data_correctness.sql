-- Keep operational counters tied to one validated auth.users row per person.
-- AI monetary values remain unavailable until their externally reconciled
-- opening balance has an explicit server-side provenance record.

begin;

alter table public.atsrs_admin_billing_config
  add column if not exists metrics_verified_at timestamptz,
  add column if not exists metrics_verification_source text;

alter table public.atsrs_admin_billing_config
  drop constraint if exists atsrs_admin_billing_config_verification_source_check;

alter table public.atsrs_admin_billing_config
  add constraint atsrs_admin_billing_config_verification_source_check
  check (
    metrics_verified_at is null
    or nullif(btrim(metrics_verification_source), '') is not null
  );

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
as $function$
declare
  v_is_admin boolean;
  v_credit numeric;
  v_baseline_spend numeric;
  v_baseline_at timestamptz;
  v_metrics_verified_at timestamptz;
  v_metrics_verification_source text;
  v_usage_cost numeric;
  v_tracked_scans bigint;
  v_unpriced_usage bigint;
  v_latest_usage timestamptz;
  v_has_aal2 boolean;
begin
  -- Preserve the independently managed AAL2 gate when that hardened helper is
  -- already installed, without making this data-correctness migration depend
  -- on an unrelated pending security migration.
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
      select false, null::bigint, null::bigint, null::numeric, null::numeric,
        null::numeric, null::bigint, null::timestamptz;
    return;
  end if;

  select
    config.purchased_credit_usd,
    config.baseline_spend_usd,
    config.baseline_recorded_at,
    config.metrics_verified_at,
    config.metrics_verification_source
  into
    v_credit,
    v_baseline_spend,
    v_baseline_at,
    v_metrics_verified_at,
    v_metrics_verification_source
  from public.atsrs_admin_billing_config as config
  where config.id = true;

  select
    coalesce(sum(usage.estimated_cost_usd), 0),
    count(*) filter (where usage.event_type = 'scan_document'),
    count(*) filter (
      where usage.estimated_cost_usd = 0
        and usage.input_tokens + usage.output_tokens > 0
    ),
    max(usage.created_at)
  into v_usage_cost, v_tracked_scans, v_unpriced_usage, v_latest_usage
  from public.atsrs_ai_usage as usage
  where usage.created_at >= v_baseline_at;

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
    population as (
      select
        count(*)::bigint as registered_users,
        count(*) filter (
          where valid_users.created_at >= now() - interval '30 days'
        )::bigint as new_users_30d
      from valid_users
    )
    select
      true,
      population.registered_users,
      population.new_users_30d,
      v_credit,
      case
        when v_metrics_verified_at is not null
          and nullif(btrim(v_metrics_verification_source), '') is not null
          and v_unpriced_usage = 0
        then round(v_baseline_spend + v_usage_cost, 4)
        else null::numeric
      end,
      case
        when v_metrics_verified_at is not null
          and nullif(btrim(v_metrics_verification_source), '') is not null
          and v_unpriced_usage = 0
        then greatest(0, round(v_credit - v_baseline_spend - v_usage_cost, 4))
        else null::numeric
      end,
      v_tracked_scans,
      greatest(
        coalesce(v_metrics_verified_at, v_baseline_at),
        coalesce(v_latest_usage, v_baseline_at)
      )
    from population;
end
$function$;

revoke all on function public.atsrs_get_admin_overview() from public, anon;
grant execute on function public.atsrs_get_admin_overview() to authenticated;

commit;
