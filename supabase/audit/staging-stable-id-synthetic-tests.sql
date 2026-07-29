\set ON_ERROR_STOP on

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $test$
declare
  profile_row record;
  original_decoded jsonb;
  old_client_decoded jsonb;
  original_source_id uuid;
  observed_source_id uuid;
  rejected boolean := false;
begin
  select
    d.user_id,
    d.account_type,
    d.data_key,
    d.payload,
    p.source_entity_id
  into strict profile_row
  from public.atsrs_workspace_data d
  join public.atsrs_workspace_personnel p
    on p.workspace_user_id = d.user_id
   and p.workspace_account_type = d.account_type
   and p.legacy_source_key = 'workspace_data:' || d.data_key || ':owner'
  where d.data_key like '%\_personal\_profile' escape '\'
  order by d.user_id, d.account_type, d.data_key
  limit 1;

  original_decoded := (profile_row.payload->>'value')::jsonb;
  old_client_decoded := original_decoded - 'atsrsId';
  original_source_id := profile_row.source_entity_id;

  update public.atsrs_workspace_data
  set payload = jsonb_set(payload, '{value}', to_jsonb(old_client_decoded::text)),
      updated_at = updated_at + interval '1 microsecond'
  where user_id = profile_row.user_id
    and account_type = profile_row.account_type
    and data_key = profile_row.data_key;

  select source_entity_id
  into strict observed_source_id
  from public.atsrs_workspace_personnel
  where workspace_user_id = profile_row.user_id
    and workspace_account_type = profile_row.account_type
    and legacy_source_key = 'workspace_data:' || profile_row.data_key || ':owner';

  if observed_source_id <> original_source_id then
    raise exception 'old-client deterministic ID changed';
  end if;

  update public.atsrs_workspace_data
  set payload = jsonb_set(
        payload,
        '{value}',
        to_jsonb(
          (old_client_decoded ||
            jsonb_build_object('atsrsId', original_source_id::text))::text
        )
      ),
      updated_at = updated_at + interval '1 microsecond'
  where user_id = profile_row.user_id
    and account_type = profile_row.account_type
    and data_key = profile_row.data_key;

  select source_entity_id
  into strict observed_source_id
  from public.atsrs_workspace_personnel
  where workspace_user_id = profile_row.user_id
    and workspace_account_type = profile_row.account_type
    and source_entity_id = original_source_id;

  if observed_source_id <> original_source_id then
    raise exception 'new-client stable ID changed';
  end if;

  update atsrs_private.runtime_flags
  set enabled = true, updated_at = now()
  where flag_name = 'stable_ids_required';

  begin
    update public.atsrs_workspace_data
    set payload = jsonb_set(payload, '{value}', to_jsonb(old_client_decoded::text)),
        updated_at = updated_at + interval '1 microsecond'
    where user_id = profile_row.user_id
      and account_type = profile_row.account_type
      and data_key = profile_row.data_key;
  exception
    when others then
      if sqlerrm not like '%stable ID compatibility refresh required%' then
        raise;
      end if;
      rejected := true;
  end;

  if not rejected then
    raise exception 'strict mode accepted an old-client payload';
  end if;

  update atsrs_private.runtime_flags
  set enabled = false, updated_at = now()
  where flag_name = 'stable_ids_required';
end;
$test$;

do $test$
declare
  company_row record;
  hydrated jsonb;
  reordered jsonb;
  before_ids text[];
  after_ids text[];
begin
  select d.user_id, d.account_type, d.data_key, d.payload
  into strict company_row
  from public.atsrs_workspace_data d
  where d.data_key like '%\_company\_personnel' escape '\'
    and jsonb_array_length((d.payload->>'value')::jsonb) >= 2
  order by d.user_id, d.account_type, d.data_key
  limit 1;

  select jsonb_agg(
           item.value ||
             jsonb_build_object('atsrsId', personnel.source_entity_id::text)
           order by item.ordinality
         )
  into strict hydrated
  from jsonb_array_elements((company_row.payload->>'value')::jsonb)
       with ordinality as item(value, ordinality)
  join public.atsrs_workspace_personnel personnel
    on personnel.workspace_user_id = company_row.user_id
   and personnel.workspace_account_type = company_row.account_type
   and personnel.legacy_source_key =
       'workspace_data:' || company_row.data_key || ':item:' || item.ordinality::text;

  select array_agg(value->>'atsrsId' order by value->>'atsrsId')
  into before_ids
  from jsonb_array_elements(hydrated) value;

  select jsonb_agg(
           case
             when item.ordinality = 1 then
               item.value || jsonb_build_object('name', 'ATSRS staging rename test')
             else item.value
           end
           order by item.ordinality desc
         )
  into reordered
  from jsonb_array_elements(hydrated) with ordinality as item(value, ordinality);

  update public.atsrs_workspace_data
  set payload = jsonb_set(payload, '{value}', to_jsonb(reordered::text)),
      updated_at = updated_at + interval '1 microsecond'
  where user_id = company_row.user_id
    and account_type = company_row.account_type
    and data_key = company_row.data_key;

  select array_agg(source_entity_id::text order by source_entity_id::text)
  into after_ids
  from public.atsrs_workspace_personnel
  where workspace_user_id = company_row.user_id
    and workspace_account_type = company_row.account_type
    and legacy_source_key like
        'workspace_data:' || company_row.data_key || ':item:%'
    and legacy_source_key not like
        'workspace_data:' || company_row.data_key || ':item:stale:%';

  if before_ids is distinct from after_ids then
    raise exception 'rename/reorder changed the stable ID set';
  end if;
end;
$test$;

do $test$
declare
  profile_row record;
  delete_rejected boolean := false;
  stale_updated integer;
begin
  select d.user_id, d.account_type, d.data_key, d.updated_at
  into strict profile_row
  from public.atsrs_workspace_data d
  join public.atsrs_workspace_personnel p
    on p.workspace_user_id = d.user_id
   and p.workspace_account_type = d.account_type
   and p.legacy_source_key = 'workspace_data:' || d.data_key || ':owner'
  join public.atsrs_personnel_certificates c
    on c.workspace_user_id = p.workspace_user_id
   and c.workspace_account_type = p.workspace_account_type
   and c.personnel_id = p.id
  where d.data_key like '%\_personal\_profile' escape '\'
  order by d.user_id, d.account_type, d.data_key
  limit 1;

  update public.atsrs_workspace_data
  set payload = payload,
      updated_at = updated_at + interval '1 microsecond'
  where user_id = profile_row.user_id
    and account_type = profile_row.account_type
    and data_key = profile_row.data_key
    and updated_at = profile_row.updated_at;

  update public.atsrs_workspace_data
  set payload = payload
  where user_id = profile_row.user_id
    and account_type = profile_row.account_type
    and data_key = profile_row.data_key
    and updated_at = profile_row.updated_at;
  get diagnostics stale_updated = row_count;

  if stale_updated <> 0 then
    raise exception 'stale optimistic write was not rejected';
  end if;

  begin
    delete from public.atsrs_workspace_data
    where user_id = profile_row.user_id
      and account_type = profile_row.account_type
      and data_key = profile_row.data_key;
  exception
    when others then
      if sqlerrm not like '%cannot delete a personnel owner with certificates%' then
        raise;
      end if;
      delete_rejected := true;
  end;

  if not delete_rejected then
    raise exception 'certificate-owner delete was not restricted';
  end if;
end;
$test$;

do $test$
declare
  first_personnel record;
  second_personnel record;
  cross_workspace_rejected boolean := false;
begin
  select id, workspace_user_id, workspace_account_type
  into strict first_personnel
  from public.atsrs_workspace_personnel
  order by workspace_user_id, workspace_account_type, id
  limit 1;

  select id, workspace_user_id, workspace_account_type
  into strict second_personnel
  from public.atsrs_workspace_personnel
  where (workspace_user_id, workspace_account_type) <>
        (first_personnel.workspace_user_id, first_personnel.workspace_account_type)
  order by workspace_user_id, workspace_account_type, id
  limit 1;

  begin
    insert into public.atsrs_personnel_certificates (
      workspace_user_id,
      workspace_account_type,
      personnel_id,
      certificate_type,
      source_entity_id,
      legacy_source_key
    )
    values (
      first_personnel.workspace_user_id,
      first_personnel.workspace_account_type,
      second_personnel.id,
      'ATSRS staging cross-workspace test',
      gen_random_uuid(),
      'staging:cross-workspace:must-fail'
    );
  exception
    when foreign_key_violation then
      cross_workspace_rejected := true;
  end;

  if not cross_workspace_rejected then
    raise exception 'cross-workspace personnel relation was accepted';
  end if;
end;
$test$;

do $test$
declare
  before_hash text;
  after_hash text;
begin
  select md5(
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', kind,
          'workspace_user_id', workspace_user_id,
          'workspace_account_type', workspace_account_type,
          'source_entity_id', source_entity_id,
          'legacy_source_key', legacy_source_key
        )
        order by kind, workspace_user_id, workspace_account_type, source_entity_id
      )::text,
      '[]'
    )
  )
  into before_hash
  from (
    select 'personnel' kind, workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_workspace_personnel
    union all
    select 'certificate', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_personnel_certificates
    union all
    select 'project', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_workspace_projects
    union all
    select 'assignment', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_project_personnel
  ) rows;

  update public.atsrs_workspace_data
  set payload = payload
  where data_key like '%\_personal\_profile' escape '\'
     or data_key like '%\_personal\_certs' escape '\'
     or data_key like '%\_company\_personnel' escape '\'
     or data_key like '%\_projects' escape '\';

  select md5(
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', kind,
          'workspace_user_id', workspace_user_id,
          'workspace_account_type', workspace_account_type,
          'source_entity_id', source_entity_id,
          'legacy_source_key', legacy_source_key
        )
        order by kind, workspace_user_id, workspace_account_type, source_entity_id
      )::text,
      '[]'
    )
  )
  into after_hash
  from (
    select 'personnel' kind, workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_workspace_personnel
    union all
    select 'certificate', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_personnel_certificates
    union all
    select 'project', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_workspace_projects
    union all
    select 'assignment', workspace_user_id, workspace_account_type,
           source_entity_id, legacy_source_key
    from public.atsrs_project_personnel
  ) rows;

  if before_hash is distinct from after_hash then
    raise exception 'idempotent rerun changed normalized identity state';
  end if;
end;
$test$;

select jsonb_build_object(
  'old_client_compatibility', true,
  'new_client_stable_id', true,
  'strict_mode_rejection', true,
  'rename_reorder_identity', true,
  'stale_write_rejection', true,
  'delete_restrict', true,
  'cross_workspace_fk', true,
  'idempotent_rerun', true,
  'transaction_rollback', true
) as synthetic_test_result;

rollback;
