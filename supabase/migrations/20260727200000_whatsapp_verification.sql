create table if not exists public.whatsapp_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('mobile', 'whatsapp')),
  destination_e164 text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  resend_after timestamptz not null,
  attempts_left integer not null default 5 check (attempts_left between 0 and 5),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_verification_challenges_user_kind_created_idx
  on public.whatsapp_verification_challenges (user_id, kind, created_at desc);

alter table public.whatsapp_verification_challenges enable row level security;
revoke all on public.whatsapp_verification_challenges from public, anon, authenticated;
grant all on public.whatsapp_verification_challenges to service_role;

create or replace function public.protect_talent_profile_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true), '');
begin
  if tg_op = 'INSERT' then
    if actor_role <> 'service_role' then
      new.phone_verified := false;
      new.whatsapp_verified := false;
    end if;
    return new;
  end if;

  if new.phone_number is distinct from old.phone_number then
    new.phone_verified := false;
  elsif actor_role <> 'service_role' then
    new.phone_verified := old.phone_verified;
  end if;

  if new.whatsapp_number is distinct from old.whatsapp_number then
    new.whatsapp_verified := false;
  elsif actor_role <> 'service_role' then
    new.whatsapp_verified := old.whatsapp_verified;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_talent_profile_verification
  on public.atsrs_talent_profiles;
create trigger protect_talent_profile_verification
before insert or update on public.atsrs_talent_profiles
for each row execute function public.protect_talent_profile_verification();

