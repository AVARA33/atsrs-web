-- Stage 19 staging follow-up: legacy rows can lack a stable source ID.
-- Re-sort the already normalized entity rows by their complete canonical JSON
-- so array order never becomes a business difference and duplicates remain.
begin;

do $preserve_v1$
begin
  if to_regprocedure(
    'atsrs_private.atsrs_workspace_business_semantic_v1(text,jsonb)'
  ) is null then
    alter function atsrs_private.atsrs_workspace_business_semantic(text, jsonb)
      rename to atsrs_workspace_business_semantic_v1;
  end if;
end;
$preserve_v1$;

create or replace function atsrs_private.atsrs_workspace_business_semantic(
  operation_key text,
  operation_value jsonb
)
returns jsonb
language plpgsql
immutable
parallel safe
security invoker
set search_path = ''
as $function$
declare
  canonical jsonb;
begin
  canonical :=
    atsrs_private.atsrs_workspace_business_semantic_v1(
      operation_key,
      operation_value
    );

  if jsonb_typeof(canonical) <> 'array' then
    return canonical;
  end if;

  return coalesce((
    select jsonb_agg(entry.value order by entry.value::text)
    from jsonb_array_elements(canonical) entry(value)
  ), '[]'::jsonb);
end;
$function$;

revoke all on function atsrs_private.atsrs_workspace_business_semantic(
  text, jsonb
) from public, anon, authenticated, service_role;
revoke all on function atsrs_private.atsrs_workspace_business_semantic_v1(
  text, jsonb
) from public, anon, authenticated, service_role;

commit;
