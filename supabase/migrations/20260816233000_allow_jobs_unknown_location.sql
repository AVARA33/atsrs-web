begin;

alter table public.atsrs_jobs alter column location drop not null;

create or replace function atsrs_private.prepare_job_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  identity_origin text;
begin
  new.title := btrim(new.title);
  new.company := btrim(new.company);
  new.location := nullif(btrim(new.location), '');
  new.country := nullif(btrim(new.country), '');
  new.work_type := nullif(btrim(new.work_type), '');
  new.worksite := nullif(btrim(new.worksite), '');
  new.equipment := nullif(btrim(new.equipment), '');
  new.mobilisation := nullif(btrim(new.mobilisation), '');
  new.duration := nullif(btrim(new.duration), '');
  new.rate := nullif(btrim(new.rate), '');
  new.currency := upper(nullif(btrim(new.currency), ''));
  new.summary := nullif(btrim(new.summary), '');
  new.description := nullif(btrim(new.description), '');
  new.requirements := nullif(btrim(new.requirements), '');
  new.recruiter_name := nullif(btrim(new.recruiter_name), '');
  new.recruiter_company := nullif(btrim(new.recruiter_company), '');
  new.recruiter_phone := nullif(btrim(new.recruiter_phone), '');
  new.recruiter_email := lower(nullif(btrim(new.recruiter_email), ''));
  new.source_type := lower(btrim(new.source_type));
  new.source_url := nullif(btrim(new.source_url), '');
  new.application_url := nullif(btrim(new.application_url), '');
  new.external_id := nullif(btrim(new.external_id), '');

  new.normalized_title := atsrs_private.normalize_job_identity_text(new.title);
  new.normalized_company := atsrs_private.normalize_job_identity_text(new.company);
  new.normalized_location := coalesce(
    atsrs_private.normalize_job_identity_text(new.location),
    ''
  );
  new.normalized_source_url := case
    when new.source_url is null then null
    else atsrs_private.normalize_job_identity_url(new.source_url)
  end;
  new.role_key := md5(concat_ws('|', new.normalized_title, new.normalized_company, new.normalized_location));

  identity_origin := case
    when new.external_id is not null then 'external:' || lower(new.external_id)
    when new.normalized_source_url is not null then 'url:' || new.normalized_source_url
    else null
  end;
  new.source_item_key := case
    when identity_origin is null then null
    else md5(new.source_type || '|' || identity_origin || '|' || new.role_key)
  end;
  return new;
end;
$$;

revoke all on function atsrs_private.prepare_job_identity() from public, anon, authenticated, service_role;

commit;
