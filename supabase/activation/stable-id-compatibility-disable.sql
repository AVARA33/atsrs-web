-- Fast non-destructive kill switch for the Stage 20 compatibility gate.
begin;

set local lock_timeout = '1s';
set local statement_timeout = '5s';

update atsrs_private.stable_id_compatibility_scopes
set kill_switch = true,
    strict_enabled = false,
    updated_at = now()
where strict_enabled
   or not kill_switch;

commit;
