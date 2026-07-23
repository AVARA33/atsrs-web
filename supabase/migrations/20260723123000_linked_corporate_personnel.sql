create table if not exists public.atsrs_talent_personnel_links (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references auth.users(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'linked'
    check (status in ('linked', 'access_pending', 'access_granted', 'access_revoked')),
  source text not null default 'talent_directory'
    check (source = 'talent_directory'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_user_id, professional_user_id)
);

create index if not exists atsrs_talent_personnel_links_company_idx
  on public.atsrs_talent_personnel_links (company_user_id, updated_at desc);

create index if not exists atsrs_talent_personnel_links_professional_idx
  on public.atsrs_talent_personnel_links (professional_user_id, updated_at desc);

alter table public.atsrs_talent_personnel_links enable row level security;

revoke all on table public.atsrs_talent_personnel_links from public, anon, authenticated;
grant select, insert, update, delete on table public.atsrs_talent_personnel_links to service_role;

comment on table public.atsrs_talent_personnel_links is
  'Corporate personnel links created from the ATSRS talent directory. Private profile and document access is granted separately.';

