-- Repository baseline for proven secure-share objects already present live.
-- Mark applied (do not replay) when reconciling the current production DB.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Only fill the legacy state that was proven live and is still empty. The
-- predicate makes the backfill repeat-safe and never changes an existing
-- expiry selected by a user.
update public.atsrs_profile_shares
set expires_at = now() + interval '7 days',
    updated_at = now()
where enabled
  and expires_at is null;

alter table public.atsrs_share_access_requests
  add column if not exists share_token_hash text;

do $share_token_contract$
begin
  if exists (
    select 1
    from public.atsrs_share_access_requests
    where share_token_hash is null
       or share_token_hash !~ '^[0-9a-f]{64}$'
  ) then
    raise exception
      'Cannot establish share_token_hash contract: invalid existing rows';
  end if;

  alter table public.atsrs_share_access_requests
    alter column share_token_hash set not null;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.atsrs_share_access_requests'::regclass
      and conname = 'atsrs_share_access_requests_share_token_hash_check'
  ) then
    alter table public.atsrs_share_access_requests
      add constraint atsrs_share_access_requests_share_token_hash_check
      check (share_token_hash ~ '^[0-9a-f]{64}$');
  end if;
end;
$share_token_contract$;

do $viewer_index_contract$
declare
  current_definition text;
begin
  select indexdef
    into current_definition
    from pg_indexes
   where schemaname = 'public'
     and indexname = 'atsrs_share_requests_viewer_token_idx';

  if current_definition is not null
     and current_definition not like
       '%(share_id, share_token_hash, viewer_token_hash)%' then
    drop index public.atsrs_share_requests_viewer_token_idx;
  end if;
end;
$viewer_index_contract$;

create index if not exists atsrs_share_requests_viewer_token_idx
  on public.atsrs_share_access_requests
    (share_id, share_token_hash, viewer_token_hash)
  where viewer_token_hash is not null;

create index if not exists atsrs_share_events_request_idx
  on public.atsrs_share_events (request_id)
  where request_id is not null;

commit;
