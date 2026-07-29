-- Fast operational rollback. This deliberately leaves additive columns and
-- constraints in place so rollback cannot destroy normalized data.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

lock table public.atsrs_workspace_data in share row exclusive mode;

update atsrs_private.runtime_flags
set enabled = false,
    updated_at = now()
where flag_name = 'stable_ids_required';

do $check$
begin
  if coalesce((
    select enabled
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
  ), true) then
    raise exception 'stable_ids_required was not disabled';
  end if;
end;
$check$;

commit;

select flag_name, enabled, updated_at
from atsrs_private.runtime_flags
where flag_name = 'stable_ids_required';
