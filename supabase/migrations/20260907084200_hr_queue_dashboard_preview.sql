begin;

create or replace function public.atsrs_get_hr_queue_preview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_has_aal2 boolean;
begin
  if to_regprocedure('atsrs_private.atsrs_request_has_aal2()') is not null then
    execute 'select atsrs_private.atsrs_request_has_aal2()' into v_has_aal2;
    if not coalesce(v_has_aal2, false) then
      raise exception using errcode = '42501', message = 'ATSRS_AAL2_REQUIRED';
    end if;
  end if;
  if not exists (
    select 1 from public.atsrs_admin_users a where a.user_id = (select auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;

  return jsonb_build_object(
    'pending_recent', (
      select count(*) from public.atsrs_job_ingestion_queue
      where state = 'pending'
        and left(payload->>'releasedDate', 10) between
          ((now() at time zone 'Asia/Baku')::date - 14)::text
          and (now() at time zone 'Asia/Baku')::date::text
    ),
    'pending_no_date', (
      select count(*) from public.atsrs_job_ingestion_queue
      where state = 'pending' and coalesce(payload->>'releasedDate', '') = ''
    ),
    'queue_preview', (
      select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
      from (
        select q.board, q.external_id, q.specialty,
          q.payload->>'name' as title,
          q.payload#>>'{company,name}' as company,
          nullif(left(q.payload->>'releasedDate', 10), '') as source_date,
          q.discovered_at, s.provider
        from public.atsrs_job_ingestion_queue q
        join public.atsrs_job_sources s using (board)
        where q.state = 'pending' and s.enabled
        order by (q.job_id is not null),
          nullif(left(q.payload->>'releasedDate', 10), '') asc nulls last,
          q.discovered_at, q.board, q.external_id
        limit 200
      ) p
    )
  );
end
$function$;

revoke all on function public.atsrs_get_hr_queue_preview() from public, anon;
grant execute on function public.atsrs_get_hr_queue_preview() to authenticated;

commit;
