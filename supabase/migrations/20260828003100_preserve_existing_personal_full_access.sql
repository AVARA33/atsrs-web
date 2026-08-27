-- Grandfather every Personal workspace that exists when the internal trial is
-- activated. Only later registrations use the seven-day window.
insert into public.atsrs_subscriptions as subscription (
  user_id, plan, status, trial_started_at, trial_ends_at, created_at, updated_at
)
select
  workspace.user_id,
  'business',
  'active',
  null,
  null,
  now(),
  now()
from public.atsrs_workspaces as workspace
where workspace.account_type = 'personal'
on conflict (user_id) do update
   set plan = 'business',
       status = 'active',
       trial_started_at = null,
       trial_ends_at = null,
       updated_at = now();
