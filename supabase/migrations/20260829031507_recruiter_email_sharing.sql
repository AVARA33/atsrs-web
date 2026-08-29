alter table public.atsrs_recruiters
  add column if not exists professional_email text,
  add column if not exists email_source_url text,
  add column if not exists email_source_type text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verification_status text not null default 'not_found';

alter table public.atsrs_recruiters
  drop constraint if exists atsrs_recruiters_professional_email_format,
  drop constraint if exists atsrs_recruiters_email_source_url_format,
  drop constraint if exists atsrs_recruiters_email_source_type_check,
  drop constraint if exists atsrs_recruiters_email_verification_status_check,
  drop constraint if exists atsrs_recruiters_verified_email_complete;

alter table public.atsrs_recruiters
  add constraint atsrs_recruiters_professional_email_format
    check (
      professional_email is null or
      (char_length(professional_email) <= 254 and professional_email ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$')
    ),
  add constraint atsrs_recruiters_email_source_url_format
    check (email_source_url is null or email_source_url ~* '^https://'),
  add constraint atsrs_recruiters_email_source_type_check
    check (email_source_type is null or email_source_type in (
      'atsrs_job_recruiter_email',
      'official_careers_contact',
      'official_company_contact_page',
      'official_company_linkedin_post',
      'official_company_page',
      'official_company_page_role_address',
      'official_company_team_page',
      'official_company_vacancy_page',
      'public_linkedin_post',
      'public_linkedin_profile',
      'public_linkedin_profile_post',
      'verified_professional_source'
    )),
  add constraint atsrs_recruiters_email_verification_status_check
    check (email_verification_status in ('verified', 'unverified', 'not_found')),
  add constraint atsrs_recruiters_verified_email_complete
    check (
      email_verification_status <> 'verified' or
      (professional_email is not null and email_source_url is not null and email_source_type is not null and email_verified_at is not null)
    );

alter table public.atsrs_profile_shares
  add column if not exists recipient_recruiter_id uuid
    references public.atsrs_recruiters(id) on delete set null,
  add column if not exists recipient_name text,
  add column if not exists recipient_company text,
  add column if not exists recipient_email text;

alter table public.atsrs_profile_shares
  drop constraint if exists atsrs_profile_shares_recipient_email_format;

alter table public.atsrs_profile_shares
  add constraint atsrs_profile_shares_recipient_email_format
    check (
      recipient_email is null or
      (char_length(recipient_email) <= 254 and recipient_email ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$')
    );

create index if not exists atsrs_profile_shares_recipient_recruiter_idx
  on public.atsrs_profile_shares (recipient_recruiter_id, created_at desc)
  where recipient_recruiter_id is not null;

comment on column public.atsrs_recruiters.professional_email is
  'Publicly sourced professional recruiter email. Usable only when email_verification_status is verified.';
comment on column public.atsrs_recruiters.email_source_url is
  'Public evidence URL used to verify the professional recruiter email.';
comment on column public.atsrs_profile_shares.recipient_recruiter_id is
  'Verified ATSRS recruiter targeted by a specific-recipient profile link.';
comment on column public.atsrs_profile_shares.recipient_email is
  'Professional email snapshot used to prepare, but never automatically send, the owner email draft.';
