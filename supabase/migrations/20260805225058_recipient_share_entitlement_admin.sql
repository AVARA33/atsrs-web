-- Service-role-only entitlement administration.
-- The ATSRS browser never receives EXECUTE permission.

create or replace function public.atsrs_set_recipient_share_entitlement(
  p_owner_user_id uuid,
  p_enabled boolean,
  p_active_limit smallint,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_owner_user_id is null
     or p_active_limit not between 0 and 100
     or p_source not in ('canary', 'billing')
  then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_ENTITLEMENT_INVALID';
  end if;

  insert into atsrs_private.atsrs_recipient_share_entitlements (
    owner_user_id, enabled, active_limit, source, updated_at
  ) values (
    p_owner_user_id, p_enabled, p_active_limit, p_source, now()
  )
  on conflict (owner_user_id) do update
    set enabled = excluded.enabled,
        active_limit = excluded.active_limit,
        source = excluded.source,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'enabled', p_enabled,
    'active_limit', p_active_limit,
    'source', p_source
  );
end
$function$;

revoke all on function public.atsrs_set_recipient_share_entitlement(
  uuid, boolean, smallint, text
) from public, anon, authenticated;
grant execute on function public.atsrs_set_recipient_share_entitlement(
  uuid, boolean, smallint, text
) to service_role;
