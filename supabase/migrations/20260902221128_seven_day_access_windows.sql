-- Seven-day access, server-authoritative countdowns and non-destructive Free limits.
-- Backup: .atsrs-backups/pre-seven-day-access-20260903 (outside repository).
begin;
create or replace function private.atsrs_personal_plan_key(p_user_id uuid)
returns text language sql stable security definer set search_path='' as $$
 select case
 when exists(select 1 from public.atsrs_admin_users where user_id=p_user_id) then 'business'
 when exists(select 1 from auth.users where id=p_user_id and raw_app_meta_data @> '{"atsrs_permanent_full_access":true}') then 'business'
 when exists(select 1 from auth.users where id=p_user_id and raw_app_meta_data @> '{"atsrs_free_plan_test":true}') then 'free'
 else coalesce((select plan from public.atsrs_subscriptions where user_id=p_user_id
 and (status='active' or (status='trialing' and trial_ends_at>now()))),'free') end;
$$;
revoke all on function private.atsrs_personal_plan_key(uuid) from public,anon,authenticated;
grant execute on function private.atsrs_personal_plan_key(uuid) to service_role;

CREATE OR REPLACE FUNCTION private.atsrs_grant_verified_signup_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_fingerprint text;
  v_claimed text;
  v_started_at timestamptz := coalesce(new.created_at, now());
begin
  if new.email_confirmed_at is null or nullif(btrim(new.email), '') is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;

  v_fingerprint := private.atsrs_signup_trial_email_fingerprint(new.email);
  if v_fingerprint is null then return new; end if;

  insert into private.atsrs_signup_trial_claims (
    email_fingerprint, first_user_id, granted_at
  ) values (
    v_fingerprint, new.id, v_started_at
  )
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
     set plan = 'business',
         status = 'trialing',
         trial_started_at = excluded.trial_started_at,
         trial_ends_at = excluded.trial_ends_at,
         updated_at = excluded.updated_at
   where subscription.plan = 'free'
     and subscription.status = 'active'
     and subscription.trial_started_at is null;

  return new;
end;
$function$
;

-- These existing ordinary accounts receive a fresh week once, at rollout.
-- The owner, permanent test engineer, expired Free test and paid Bronze stay unchanged.
insert into public.atsrs_subscriptions as s(user_id,plan,status,trial_started_at,trial_ends_at)
select u.id,'business','trialing',now(),now()+interval '7 days'
from auth.users u left join public.atsrs_subscriptions old on old.user_id=u.id
where u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and not exists(select 1 from public.atsrs_admin_users a where a.user_id=u.id)
 and not coalesce(u.raw_app_meta_data @> '{"atsrs_permanent_full_access":true}',false)
 and not coalesce(u.raw_app_meta_data @> '{"atsrs_free_plan_test":true}',false)
 and not (coalesce(old.plan,'free')='pro' and coalesce(old.status,'')='active')
on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,
 trial_started_at=excluded.trial_started_at,trial_ends_at=excluded.trial_ends_at,updated_at=now();

create or replace function private.atsrs_access_state(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'server_now',now(),'user_id',u.id,'plan_key',private.atsrs_personal_plan_key(u.id),
 'full_access',private.atsrs_personal_plan_key(u.id)<>'free',
 'permanent',exists(select 1 from public.atsrs_admin_users a where a.user_id=u.id)
   or coalesce(u.raw_app_meta_data @> '{"atsrs_permanent_full_access":true}',false),
 'started_at',case when s.status='trialing' then s.trial_started_at end,
 'ends_at',case when s.status='trialing'
  and not exists(select 1 from public.atsrs_admin_users a where a.user_id=u.id)
  and not coalesce(u.raw_app_meta_data @> '{"atsrs_permanent_full_access":true}',false)
  then s.trial_ends_at end,
 'document_limit',e.tracked_documents_limit,'cv_limit',e.profile_cv_limit,
 'storage_limit',e.storage_bytes_limit)
 from auth.users u left join public.atsrs_subscriptions s on s.user_id=u.id
 join private.atsrs_personal_plan_entitlements e on e.plan_key=private.atsrs_personal_plan_key(u.id)
 where u.id=p_user_id;
$$;
revoke all on function private.atsrs_access_state(uuid) from public,anon,authenticated;
create or replace function public.atsrs_service_access_state(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select private.atsrs_access_state(p_user_id);
$$;
revoke all on function public.atsrs_service_access_state(uuid) from public,anon,authenticated;
grant execute on function public.atsrs_service_access_state(uuid) to service_role;

-- Oldest documents remain accessible within Free limits. Metadata stays visible.
create or replace function private.atsrs_accessible_files(p_user_id uuid)
returns table(id uuid) language sql stable security definer set search_path='' as $$
 with ranked as (
 select f.id,f.category,
 row_number() over(order by f.created_at,f.id) n,
 sum(greatest(coalesce(f.size_bytes,0),0)) over(order by f.created_at,f.id) bytes,
 count(*) filter(where f.category='cv') over(order by f.created_at,f.id) cv_n
 from public.atsrs_files f where f.user_id=p_user_id and f.account_type='personal')
 select r.id from ranked r join private.atsrs_personal_plan_entitlements e
 on e.plan_key=private.atsrs_personal_plan_key(p_user_id)
 where r.n<=e.tracked_documents_limit and (e.storage_bytes_limit is null or r.bytes<=e.storage_bytes_limit)
 and (r.category<>'cv' or r.cv_n<=e.profile_cv_limit)
 union all select f.id from public.atsrs_files f where f.user_id=p_user_id and f.account_type<>'personal';
$$;
revoke all on function private.atsrs_accessible_files(uuid) from public,anon,authenticated;
grant execute on function private.atsrs_accessible_files(uuid) to service_role;

create or replace function private.atsrs_can_upload(p_user_id uuid,p_bytes bigint default 0,p_category text default '')
returns boolean language sql stable security definer set search_path='' as $$
 select count(f.id)<e.tracked_documents_limit
 and (e.storage_bytes_limit is null or coalesce(sum(f.size_bytes),0)+greatest(p_bytes,0)<=e.storage_bytes_limit)
 and (p_category<>'cv' or count(f.id) filter(where f.category='cv')<e.profile_cv_limit)
 from private.atsrs_personal_plan_entitlements e left join public.atsrs_files f
 on f.user_id=p_user_id and f.account_type='personal'
 where e.plan_key=private.atsrs_personal_plan_key(p_user_id)
 group by e.tracked_documents_limit,e.storage_bytes_limit,e.profile_cv_limit;
$$;
revoke all on function private.atsrs_can_upload(uuid,bigint,text) from public,anon,authenticated;

create or replace function public.atsrs_my_access_state()
returns jsonb language sql stable security definer set search_path='' as $$
 select private.atsrs_access_state(auth.uid()) || jsonb_build_object(
 'can_upload',private.atsrs_can_upload(auth.uid()),
 'locked_file_ids',coalesce((select jsonb_agg(f.id) from public.atsrs_files f
 where f.user_id=auth.uid() and not exists(select 1 from private.atsrs_accessible_files(auth.uid()) a where a.id=f.id)),'[]'::jsonb));
$$;
revoke all on function public.atsrs_my_access_state() from public,anon;
grant execute on function public.atsrs_my_access_state() to authenticated;

create or replace function private.atsrs_file_access(p_user_id uuid,p_file_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('allowed',exists(select 1 from private.atsrs_accessible_files(p_user_id) a where a.id=p_file_id),
 'ttl_seconds',greatest(1,least(300,coalesce(ceil(extract(epoch from
 (nullif(private.atsrs_access_state(p_user_id)->>'ends_at','')::timestamptz-now())))::integer,300))))
$$;
revoke all on function private.atsrs_file_access(uuid,uuid) from public,anon,authenticated;
grant execute on function private.atsrs_file_access(uuid,uuid) to service_role;
create or replace function public.atsrs_my_file_access(p_file_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select private.atsrs_file_access(auth.uid(),p_file_id);
$$;
revoke all on function public.atsrs_my_file_access(uuid) from public,anon;
grant execute on function public.atsrs_my_file_access(uuid) to authenticated;
create or replace function public.atsrs_service_file_access(p_user_id uuid,p_file_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select private.atsrs_file_access(p_user_id,p_file_id);
$$;
revoke all on function public.atsrs_service_file_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.atsrs_service_file_access(uuid,uuid) to service_role;

create or replace function public.atsrs_service_upload_access(p_user_id uuid,p_bytes bigint default 0,p_category text default '')
returns boolean language sql stable security definer set search_path='' as $$
 select private.atsrs_can_upload(p_user_id,p_bytes,p_category);
$$;
revoke all on function public.atsrs_service_upload_access(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.atsrs_service_upload_access(uuid,bigint,text) to service_role;

-- Restricted policy is ANDed with existing owner-only policies, including future ones.
create or replace function public.atsrs_own_storage_access(p_path text,p_upload boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(p_path,'/',1)=auth.uid()::text and
 case when split_part(p_path,'/',2)<>'personal' then
 exists(select 1 from public.atsrs_workspaces w where w.user_id=auth.uid() and w.account_type='company')
 when exists(select 1 from public.atsrs_files f where f.user_id=auth.uid() and f.storage_path=p_path) then
 exists(select 1 from public.atsrs_files f join private.atsrs_accessible_files(auth.uid()) a on a.id=f.id
 where f.user_id=auth.uid() and f.storage_path=p_path)
 else private.atsrs_can_upload(auth.uid(),0,split_part(p_path,'/',3)) end;
$$;
revoke all on function public.atsrs_own_storage_access(text,boolean) from public,anon;
grant execute on function public.atsrs_own_storage_access(text,boolean) to authenticated;
create policy atsrs_plan_read_files on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'atsrs-user-files' or public.atsrs_own_storage_access(name,false));
create policy atsrs_plan_insert_files on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'atsrs-user-files' or public.atsrs_own_storage_access(name,true));
create policy atsrs_plan_update_files on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'atsrs-user-files' or public.atsrs_own_storage_access(name,false))
 with check(bucket_id<>'atsrs-user-files' or public.atsrs_own_storage_access(name,true));

CREATE OR REPLACE FUNCTION public.atsrs_enforce_file_plan_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_plan text;
  v_document_limit integer;
  v_storage_limit bigint;
  v_cv_limit integer;
  v_count integer;
  v_storage bigint;
  v_cv_count integer;
begin
  if new.account_type <> 'personal' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 6012));
  v_plan := private.atsrs_personal_plan_key(new.user_id);

  select
    entitlement.tracked_documents_limit,
    entitlement.storage_bytes_limit,
    entitlement.profile_cv_limit
    into v_document_limit, v_storage_limit, v_cv_limit
    from private.atsrs_personal_plan_entitlements as entitlement
   where entitlement.plan_key = v_plan;

  select count(*)::integer, coalesce(sum(file.size_bytes), 0)::bigint
    into v_count, v_storage
    from public.atsrs_files as file
   where file.user_id = new.user_id
     and file.account_type = 'personal';

  if v_count >= v_document_limit then
    raise exception 'ATSRS % plan tracked-document limit reached (% documents).',
      initcap(v_plan), v_document_limit using errcode = 'P0001';
  end if;

  if v_storage_limit is not null
     and v_storage + coalesce(new.size_bytes, 0) > v_storage_limit then
    raise exception 'ATSRS % plan storage limit reached.', initcap(v_plan)
      using errcode = 'P0001';
  end if;

  if new.category = 'cv' then
    select count(*)::integer
      into v_cv_count
      from public.atsrs_files as file
     where file.user_id = new.user_id
       and file.account_type = 'personal'
       and file.category = 'cv';

    if v_cv_count >= v_cv_limit then
      raise exception 'ATSRS % plan Profile CV limit reached (% CVs).',
        initcap(v_plan), v_cv_limit using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$
;

create or replace function public.atsrs_protect_locked_file()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.account_type='personal' and (current_user<>'service_role') then
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.account_type is distinct from old.account_type or new.created_at is distinct from old.created_at
    or new.storage_path is distinct from old.storage_path or new.size_bytes is distinct from old.size_bytes
    or new.category is distinct from old.category then
   raise exception 'ATSRS_FILE_IDENTITY_IMMUTABLE' using errcode='42501';
  end if;
  if not exists(select 1 from private.atsrs_accessible_files(old.user_id) a where a.id=old.id) then
   raise exception 'ATSRS_FILE_LOCKED_BY_PLAN' using errcode='42501';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.atsrs_protect_locked_file() from public,anon,authenticated;
create trigger atsrs_protect_locked_file before update on public.atsrs_files
for each row execute function public.atsrs_protect_locked_file();

create or replace function public.atsrs_get_developer_access_windows()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 -- Reuse existing owner AND AAL2 authorization; do not trust browser roles.
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object('server_now',now(),'rows',coalesce(jsonb_agg(
 to_jsonb(r) || jsonb_build_object('access',private.atsrs_access_state(u.id))
 order by r.registered_at desc),'[]'::jsonb)) into result
 from public.atsrs_get_developer_registrations() r join auth.users u on u.email=r.email;
 return result;
end;
$$;
revoke all on function public.atsrs_get_developer_access_windows() from public,anon;
grant execute on function public.atsrs_get_developer_access_windows() to authenticated;

CREATE OR REPLACE FUNCTION public.atsrs_authorize_recipient_document(p_share_id uuid, p_token_hash text, p_session_hash text, p_document_id uuid, p_action text, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  share_row public.atsrs_recipient_shares%rowtype;
  session_row public.atsrs_recipient_share_viewer_sessions%rowtype;
  request_row public.atsrs_recipient_share_access_requests%rowtype;
  file_path text;
begin
  if p_action not in ('preview', 'download') then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_INVALID_ACTION';
  end if;
  select * into share_row from public.atsrs_recipient_shares
   where id = p_share_id and token_hash = p_token_hash for update;
  if not found or share_row.status <> 'active' or share_row.expires_at <= now()
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SHARE_UNAVAILABLE';
  end if;
  select * into session_row
    from public.atsrs_recipient_share_viewer_sessions
   where share_id = share_row.id and session_hash = p_session_hash
     and revoked_at is null and expires_at > now()
     and p_action = any(scope)
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SESSION_INVALID';
  end if;
  select f.storage_path into file_path
    from public.atsrs_recipient_share_documents d
    join public.atsrs_files f on f.id = d.document_id
   where d.share_id = share_row.id and d.document_id = p_document_id
     and f.user_id = share_row.owner_user_id
     and f.account_type = share_row.account_type;
  if file_path is null or not exists(select 1 from private.atsrs_accessible_files(share_row.owner_user_id) a where a.id=p_document_id) then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOCUMENT_UNAVAILABLE';
  end if;
  if p_action = 'preview' and not share_row.allow_preview then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_PREVIEW_NOT_ALLOWED';
  end if;
  if p_action = 'download' then
    if not share_row.allow_download or p_request_id is null then
      raise exception using errcode = '42501',
        message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_ALLOWED';
    end if;
    select * into request_row
      from public.atsrs_recipient_share_access_requests
     where id = p_request_id
       and dedicated_share_id = share_row.id
       and viewer_session_id = session_row.id
     for update;
    if not found or request_row.status <> 'approved'
       or request_row.access_expires_at <= now()
       or not (p_document_id = any(request_row.requested_document_ids))
    then
      raise exception using errcode = '42501',
        message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_APPROVED';
    end if;
  end if;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, request_id, document_id, event_type, reason_code
  ) values (
    share_row.id, share_row.owner_user_id, p_request_id, p_document_id,
    case when p_action = 'preview' then 'previewed' else 'downloaded' end,
    'viewer_authorized'
  );
  update public.atsrs_recipient_shares
     set last_activity_at = now()
   where id = share_row.id;
  update public.atsrs_recipient_share_viewer_sessions
     set last_seen_at = now()
   where id = session_row.id;
  return jsonb_build_object(
    'storage_path', file_path,
    'expires_at', least(now()+make_interval(secs=>(private.atsrs_file_access(share_row.owner_user_id,p_document_id)->>'ttl_seconds')::integer),share_row.expires_at, session_row.expires_at,
      coalesce(request_row.access_expires_at, share_row.expires_at))
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_RECIPIENT_DOWNLOAD_ALREADY_USED';
end
$function$
;
commit;
