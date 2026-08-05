-- Non-destructive emergency kill switch for Dedicated Recipient Links.
-- General Share is not affected and dedicated records are retained.
update atsrs_private.atsrs_recipient_share_entitlements
   set enabled = false,
       updated_at = now()
 where enabled is true;
