-- STAGING ONLY. Every synthetic row is rolled back.
begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'storage'
      and relation.relname = 'objects'
      and relation.relrowsecurity
  ) then
    raise exception
      'Stage 24 requires storage.objects RLS enabled in the staging baseline';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'atsrs-user-files'
  ) then
    raise exception
      'Stage 24 requires the atsrs-user-files bucket metadata in staging';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles = array['authenticated']::name[]
      and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      and (
        coalesce(qual, '') like '%storage.foldername(name)%auth.uid()%'
        or coalesce(with_check, '') like '%storage.foldername(name)%auth.uid()%'
      )
  ) < 4 then
    raise exception
      'Stage 24 requires the authenticated owner-path Storage policies';
  end if;
end;
$preflight$;

create temporary table stage24_results (
  gate text primary key,
  value bigint not null
) on commit drop;

grant all on stage24_results to authenticated, anon;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  $json${"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}$json$,
  true
);

insert into storage.objects (
  bucket_id,
  name,
  owner,
  owner_id,
  metadata
) values (
  'atsrs-user-files',
  '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt',
  '11111111-1111-4111-8111-111111111111'::uuid,
  '11111111-1111-4111-8111-111111111111',
  $json${"size":1,"stage":"synthetic"}$json$::jsonb
);

insert into stage24_results
values (
  'owner_select',
  (
    select count(*)
    from storage.objects
    where name =
      '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt'
  )
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  $json${"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}$json$,
  true
);

insert into stage24_results
values (
  'cross_user_select',
  (
    select count(*)
    from storage.objects
    where name =
      '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt'
  )
);

with changed as (
  update storage.objects
  set metadata = $json${"size":2}$json$::jsonb
  where name =
    '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt'
  returning 1
)
insert into stage24_results
select 'cross_user_update', count(*) from changed;

with removed as (
  delete from storage.objects
  where name =
    '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt'
  returning 1
)
insert into stage24_results
select 'cross_user_delete', count(*) from removed;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', $json${"role":"anon"}$json$, true);

insert into stage24_results
values (
  'anon_select',
  (
    select count(*)
    from storage.objects
    where name =
      '11111111-1111-4111-8111-111111111111/stage24-synthetic.txt'
  )
);

reset role;

select jsonb_object_agg(gate, value order by gate)
  as stage24_storage_rls_synthetic
from stage24_results;

rollback;
