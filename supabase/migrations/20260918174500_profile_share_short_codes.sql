alter table public.atsrs_profile_shares
  add column if not exists short_code_hash text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.atsrs_profile_shares'::regclass
       and conname = 'atsrs_profile_shares_short_code_hash_check'
  ) then
    alter table public.atsrs_profile_shares
      add constraint atsrs_profile_shares_short_code_hash_check
      check (short_code_hash is null or short_code_hash ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

create unique index if not exists atsrs_profile_shares_short_code_hash_key
  on public.atsrs_profile_shares (short_code_hash)
  where short_code_hash is not null;

comment on column public.atsrs_profile_shares.short_code_hash is
  'SHA-256 hash of the deterministic, high-entropy /s/ bearer alias. The raw alias is never stored.';
