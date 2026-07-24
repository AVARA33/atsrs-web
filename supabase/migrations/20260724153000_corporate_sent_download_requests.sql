begin;

alter table public.atsrs_share_access_requests
  add column if not exists requester_user_id uuid references auth.users(id) on delete set null;

create index if not exists atsrs_share_access_requests_requester_user_created_idx
  on public.atsrs_share_access_requests (requester_user_id, created_at desc)
  where requester_user_id is not null;

-- Safely connect historical requests when both sides independently verified
-- the exact same email address.
update public.atsrs_share_access_requests as request
set requester_user_id = auth_user.id,
    updated_at = now()
from auth.users as auth_user
where request.requester_user_id is null
  and request.email_verified_at is not null
  and lower(request.requester_email) = lower(auth_user.email)
  and exists (
    select 1
    from public.atsrs_workspaces as workspace
    where workspace.user_id = auth_user.id
      and workspace.account_type = 'company'
  );

commit;
