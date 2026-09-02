begin;
-- Explicit test-account exceptions are stored server-side, never in client metadata.
update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)
 || '{"atsrs_permanent_full_access":true,"atsrs_test_engineer":true}'::jsonb
 where lower(email)='elvin.balayev@gmail.com';
update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)
 || '{"atsrs_free_plan_test":true}'::jsonb
 where lower(email)='myxmiboxs@gmail.com';
update public.atsrs_subscriptions s set status='trialing',
 trial_ends_at=least(coalesce(s.trial_ends_at,now()),now()-interval '1 minute'),
 trial_started_at=least(coalesce(s.trial_started_at,now()-interval '7 days 1 minute'),now()-interval '7 days 1 minute'),
 updated_at=now()
 from auth.users u where u.id=s.user_id and lower(u.email)='myxmiboxs@gmail.com';

-- Free documents inside quota still need a usable preview URL after the week ends.
create or replace function private.atsrs_file_access(p_user_id uuid,p_file_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with timing as (select nullif(private.atsrs_access_state(p_user_id)->>'ends_at','')::timestamptz as ends_at)
 select jsonb_build_object(
 'allowed',exists(select 1 from private.atsrs_accessible_files(p_user_id) a where a.id=p_file_id),
 'ttl_seconds',case when ends_at>now() then greatest(1,least(300,ceil(extract(epoch from (ends_at-now())))::integer)) else 300 end)
 from timing;
$$;
commit;
