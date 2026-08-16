-- Keep account-scoped file metadata queries fast as document history grows.
-- File bytes remain in private Supabase Storage and are fetched only on demand.
create index if not exists atsrs_files_owner_created_idx
  on public.atsrs_files (user_id, account_type, created_at desc);

create index if not exists atsrs_files_owner_category_created_idx
  on public.atsrs_files (user_id, account_type, category, created_at desc);
