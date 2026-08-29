-- A profile owner may have only one enabled share per ATSRS recruiter. Expired
-- rows are disabled before the invariant is installed; duplicate active rows
-- keep the newest link so existing browser tokens remain as useful as possible.
update public.atsrs_profile_shares
set enabled = false,
    updated_at = now()
where recipient_recruiter_id is not null
  and enabled = true
  and expires_at <= now();

with ranked as (
  select id,
         row_number() over (
           partition by user_id, account_type, recipient_recruiter_id
           order by created_at desc, id desc
         ) as active_rank
  from public.atsrs_profile_shares
  where recipient_recruiter_id is not null
    and enabled = true
)
update public.atsrs_profile_shares as share
set enabled = false,
    updated_at = now()
from ranked
where share.id = ranked.id
  and ranked.active_rank > 1;

create unique index if not exists atsrs_profile_shares_one_enabled_recruiter_idx
  on public.atsrs_profile_shares (user_id, account_type, recipient_recruiter_id)
  where recipient_recruiter_id is not null and enabled = true;
