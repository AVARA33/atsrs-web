-- Service-role-only entitlement lookup for the Recipient Links Edge Function.

create or replace function public.atsrs_get_recipient_share_entitlement(
  p_owner_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (
      select jsonb_build_object(
        'enabled', enabled,
        'active_limit', active_limit,
        'source', source
      )
      from atsrs_private.atsrs_recipient_share_entitlements
      where owner_user_id = p_owner_user_id
    ),
    jsonb_build_object(
      'enabled', false,
      'active_limit', 0,
      'source', 'none'
    )
  )
$function$;

revoke all on function public.atsrs_get_recipient_share_entitlement(uuid)
  from public, anon, authenticated;
grant execute on function public.atsrs_get_recipient_share_entitlement(uuid)
  to service_role;
