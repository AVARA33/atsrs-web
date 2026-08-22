-- Define the existing internal business entitlement as the TITAN Personal tier.
-- This account tier is already active for one internal Personal account.

begin;

update private.atsrs_personal_plan_entitlements
   set public_name = 'Titan',
       storage_bytes_limit = 21474836480,
       updated_at = now()
 where plan_key = 'business';

commit;
