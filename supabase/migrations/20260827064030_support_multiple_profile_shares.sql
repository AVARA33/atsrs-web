alter table public.atsrs_profile_shares
  add column if not exists audience text not null default 'anyone'
    check (audience in ('anyone', 'recruiters', 'recipient'));

alter table public.atsrs_profile_shares
  drop constraint if exists atsrs_profile_shares_user_id_account_type_key;

create unique index if not exists atsrs_profile_shares_single_broad_audience_idx
  on public.atsrs_profile_shares (user_id, account_type, audience)
  where audience in ('anyone', 'recruiters');

create index if not exists atsrs_profile_shares_owner_created_idx
  on public.atsrs_profile_shares (user_id, account_type, created_at desc);

comment on column public.atsrs_profile_shares.audience is
  'Share audience. Owners may have one Anyone link, one Recruiters link, and multiple Specific recipient links.';
