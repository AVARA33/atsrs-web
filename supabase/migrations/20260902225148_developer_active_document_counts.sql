begin;
create or replace function public.atsrs_get_developer_access_windows()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 -- Preserve existing owner authorization and any configured assurance check.
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object('server_now',now(),'rows',coalesce(jsonb_agg(
 to_jsonb(r) || jsonb_build_object(
   'access',private.atsrs_access_state(u.id),
   'uploaded_file_count',coalesce(f.file_count,0),
   'document_count',coalesce(f.document_count,0),
   'cv_count',coalesce(f.cv_count,0))
 order by r.registered_at desc),'[]'::jsonb)) into result
 from public.atsrs_get_developer_registrations() r
 join auth.users u on u.email=r.email
 left join (
   -- Stored uploads across workspaces, including CVs and references.
   -- Locked files still count; deleted files and temporary AI uploads do not.
   select files.user_id,count(*) as file_count,
     count(*) filter (where category='cv') as cv_count,
     count(*) filter (where category='document' and exists (
       select 1 from public.atsrs_workspace_data w
       where w.user_id=files.user_id and w.account_type=files.account_type
         and w.data_key like '%_certs'
         and w.payload::text like '%' || files.id::text || '%'
     )) as document_count
   from public.atsrs_files files group by files.user_id
 ) f on f.user_id=u.id;
 return result;
end;
$$;
revoke all on function public.atsrs_get_developer_access_windows() from public,anon;
grant execute on function public.atsrs_get_developer_access_windows() to authenticated;
commit;
