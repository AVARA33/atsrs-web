-- Non-destructive Stage 19 feature rollback.
-- Removes only the targeted revision reader added by its paired activation.
begin;

set local lock_timeout = '250ms';
set local statement_timeout = '5s';

revoke all on function public.atsrs_get_workspace_command_revision(text)
from public, anon, authenticated, service_role;

drop function if exists public.atsrs_get_workspace_command_revision(text);

commit;
