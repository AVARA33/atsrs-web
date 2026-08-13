-- ATSRS owner-only Personal plan and account entitlement administration.
-- Canonical migration: legacy subscription values are converted once and all
-- core quota enforcement moves to the entitlement resolver.

begin;

create schema if not exists atsrs_private;

-- One canonical plan model. Existing legacy rows are converted once, then the
-- old values are rejected at the database boundary.
alter table public.atsrs_subscriptions
  drop constraint if exists atsrs_subscriptions_plan_check;
update public.atsrs_subscriptions set plan = 'titan', updated_at = now() where plan = 'pro';
update public.atsrs_subscriptions set plan = 'gold', updated_at = now() where plan = 'business';
alter table public.atsrs_subscriptions
  add constraint atsrs_subscriptions_plan_check
  check (plan in ('free','bronze','silver','titan','gold'));

create table if not exists atsrs_private.atsrs_entitlement_services (
  service_key text primary key,
  display_name text not null,
  unit_label text not null,
  sort_order smallint not null,
  active boolean not null default true,
  constraint atsrs_entitlement_services_key_check
    check (service_key ~ '^[a-z][a-z0-9_]{1,63}$')
);

create table if not exists atsrs_private.atsrs_plan_entitlements (
  plan_key text not null,
  service_key text not null references atsrs_private.atsrs_entitlement_services(service_key),
  allowance integer not null default 0 check (allowance >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (plan_key, service_key),
  constraint atsrs_plan_entitlements_plan_check
    check (plan_key in ('free','bronze','silver','titan','gold'))
);

create table if not exists atsrs_private.atsrs_account_entitlement_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null references atsrs_private.atsrs_entitlement_services(service_key),
  quantity integer not null default 0 check (quantity >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, service_key)
);

create table if not exists atsrs_private.atsrs_account_entitlement_adjustments (
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null references atsrs_private.atsrs_entitlement_services(service_key),
  quantity integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, service_key),
  constraint atsrs_account_entitlement_adjustment_bound
    check (quantity between -1000000 and 1000000)
);

create table if not exists atsrs_private.atsrs_entitlement_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  plan_key text,
  service_key text,
  source_bucket text,
  previous_quantity integer,
  change_quantity integer,
  new_quantity integer,
  reason text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint atsrs_entitlement_audit_action_check
    check (action in ('plan_default','account_plan','account_adjustment','account_reset')),
  constraint atsrs_entitlement_audit_source_check
    check (source_bucket is null or source_bucket in ('purchased','manual')),
  constraint atsrs_entitlement_audit_reason_present
    check (char_length(btrim(reason)) between 2 and 120),
  constraint atsrs_entitlement_audit_notes_bound
    check (notes is null or char_length(notes) <= 1000)
);

create index if not exists atsrs_entitlement_audit_target_created_idx
  on atsrs_private.atsrs_entitlement_audit_log(target_user_id, created_at desc);

alter table atsrs_private.atsrs_entitlement_services enable row level security;
alter table atsrs_private.atsrs_plan_entitlements enable row level security;
alter table atsrs_private.atsrs_account_entitlement_purchases enable row level security;
alter table atsrs_private.atsrs_account_entitlement_adjustments enable row level security;
alter table atsrs_private.atsrs_entitlement_audit_log enable row level security;

revoke all on all tables in schema atsrs_private from public, anon, authenticated;
revoke all on all sequences in schema atsrs_private from public, anon, authenticated;
grant usage on schema atsrs_private to service_role;
grant select, insert, update, delete on all tables in schema atsrs_private to service_role;
grant usage, select on all sequences in schema atsrs_private to service_role;

insert into atsrs_private.atsrs_entitlement_services
  (service_key, display_name, unit_label, sort_order)
values
  ('ai_document_scans','AI document scans','scans',10),
  ('ai_cv_generations','AI CV generations','generations',20),
  ('candidate_directory_visibility','Candidate directory visibility','access',30),
  ('recipient_share_links','Recipient share links','active links',40),
  ('whatsapp_expiry_reminders','WhatsApp expiry reminders','credits',50),
  ('email_expiry_reminders','Email expiry reminders','credits',60),
  ('stored_documents','Stored documents','documents',70),
  ('cv_slots','CV slots','CVs',80)
on conflict (service_key) do update set
  display_name = excluded.display_name,
  unit_label = excluded.unit_label,
  sort_order = excluded.sort_order;

-- Confirmed launch rules. Zero for an undecided paid allowance means the owner
-- must set it in Admin before that service is sold for the plan.
insert into atsrs_private.atsrs_plan_entitlements (plan_key, service_key, allowance)
select plan.plan_key, service.service_key,
  case
    when plan.plan_key = 'free' and service.service_key = 'ai_document_scans' then 1
    when plan.plan_key = 'free' and service.service_key = 'ai_cv_generations' then 1
    when plan.plan_key = 'free' and service.service_key = 'stored_documents' then 20
    when plan.plan_key = 'free' and service.service_key = 'cv_slots' then 1
    when plan.plan_key <> 'free' and service.service_key = 'candidate_directory_visibility' then 1
    when plan.plan_key = 'titan' and service.service_key = 'ai_document_scans' then 100
    when plan.plan_key = 'titan' and service.service_key = 'ai_cv_generations' then 3
    when plan.plan_key = 'titan' and service.service_key = 'stored_documents' then 200
    when plan.plan_key = 'gold' and service.service_key = 'ai_document_scans' then 500
    when plan.plan_key = 'gold' and service.service_key = 'ai_cv_generations' then 10
    when plan.plan_key = 'gold' and service.service_key = 'stored_documents' then 2000
    else 0
  end
from (values ('free'),('bronze'),('silver'),('titan'),('gold')) as plan(plan_key)
cross join atsrs_private.atsrs_entitlement_services service
on conflict (plan_key, service_key) do nothing;

-- Every Personal workspace receives a canonical subscription row.
insert into public.atsrs_subscriptions (user_id,plan,status)
select workspace.user_id,'free','active'
from public.atsrs_workspaces workspace
where workspace.account_type='personal'
on conflict (user_id) do nothing;

create or replace function atsrs_private.atsrs_is_entitlement_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_user_id is not null and exists (
    select 1 from public.atsrs_admin_users admin_user
    where admin_user.user_id = p_user_id
  )
$function$;

revoke all on function atsrs_private.atsrs_is_entitlement_admin(uuid)
  from public, anon, authenticated;

create or replace function atsrs_private.atsrs_entitlement_used(
  p_user_id uuid,
  p_plan_key text,
  p_service_key text
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  used_quantity integer := 0;
  period_start date := date_trunc('month', timezone('UTC', now()))::date;
begin
  case p_service_key
    when 'ai_document_scans' then
      if p_plan_key = 'free' then
        select coalesce(sum(scan_count),0)::integer into used_quantity
        from public.atsrs_ai_scan_usage where user_id = p_user_id;
      else
        select coalesce(scan_count,0) into used_quantity
        from public.atsrs_ai_scan_usage
        where user_id = p_user_id and atsrs_ai_scan_usage.period_start = period_start;
      end if;
    when 'ai_cv_generations' then
      if p_plan_key = 'free' then period_start := date '1970-01-01'; end if;
      select coalesce(generation_count,0) into used_quantity
      from public.atsrs_ai_cv_usage
      where user_id = p_user_id and atsrs_ai_cv_usage.period_start = period_start;
    when 'recipient_share_links' then
      select count(*)::integer into used_quantity
      from public.atsrs_recipient_shares
      where owner_user_id = p_user_id and status = 'active' and expires_at > now();
    when 'whatsapp_expiry_reminders' then
      select count(*)::integer into used_quantity
      from public.atsrs_notification_outbox
      where user_id = p_user_id and account_type = 'personal'
        and channel = 'whatsapp' and status = 'sent'
        and sent_at >= date_trunc('month', now());
    when 'email_expiry_reminders' then
      select count(*)::integer into used_quantity
      from public.atsrs_notification_outbox
      where user_id = p_user_id and account_type = 'personal'
        and channel = 'email' and status = 'sent'
        and sent_at >= date_trunc('month', now());
    when 'stored_documents' then
      select count(*)::integer into used_quantity
      from public.atsrs_files
      where user_id = p_user_id and account_type = 'personal';
    when 'cv_slots' then
      select count(*)::integer into used_quantity
      from public.atsrs_files
      where user_id = p_user_id and account_type = 'personal' and category = 'cv';
    else used_quantity := 0;
  end case;
  return coalesce(used_quantity,0);
end
$function$;

revoke all on function atsrs_private.atsrs_entitlement_used(uuid,text,text)
  from public, anon, authenticated;

create or replace function public.atsrs_admin_entitlements_bootstrap(p_query text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  safe_query text := left(btrim(coalesce(p_query,'')),120);
  result jsonb;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;

  select jsonb_build_object(
    'is_admin', true,
    'plans', jsonb_build_array('free','bronze','silver','titan','gold'),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', service.service_key,
        'name', service.display_name,
        'unit', service.unit_label
      ) order by service.sort_order)
      from atsrs_private.atsrs_entitlement_services service where service.active
    ),'[]'::jsonb),
    'defaults', coalesce((
      select jsonb_agg(jsonb_build_object(
        'plan', entitlement.plan_key,
        'service', entitlement.service_key,
        'allowance', entitlement.allowance
      ) order by entitlement.plan_key, service.sort_order)
      from atsrs_private.atsrs_plan_entitlements entitlement
      join atsrs_private.atsrs_entitlement_services service
        on service.service_key = entitlement.service_key
    ),'[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(to_jsonb(account_row) order by account_row.name, account_row.email)
      from (
        select auth_user.id,
          coalesce(nullif(btrim(concat(profile.name,' ',profile.surname)),''),
                   split_part(auth_user.email,'@',1),'Personal account') as name,
          auth_user.email,
          coalesce(subscription.plan,'free') as plan,
          coalesce(subscription.status,'active') as status
        from auth.users auth_user
        join public.atsrs_workspaces workspace
          on workspace.user_id = auth_user.id and workspace.account_type = 'personal'
        left join public.atsrs_talent_profiles profile on profile.user_id = auth_user.id
        left join public.atsrs_subscriptions subscription on subscription.user_id = auth_user.id
        where safe_query = ''
           or auth_user.email ilike '%' || safe_query || '%'
           or profile.name ilike '%' || safe_query || '%'
           or profile.surname ilike '%' || safe_query || '%'
        order by auth_user.created_at desc
        limit 50
      ) account_row
    ),'[]'::jsonb)
  ) into result;
  return result;
end
$function$;

create or replace function public.atsrs_admin_account_entitlements(
  p_user_id uuid,
  p_preview_plan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  assigned_plan text;
  selected_plan text;
  result jsonb;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;
  if not exists (select 1 from public.atsrs_workspaces where user_id = p_user_id and account_type = 'personal') then
    raise exception using errcode = '22023', message = 'ATSRS_PERSONAL_ACCOUNT_REQUIRED';
  end if;

  select coalesce(subscription.plan,'free')
  into assigned_plan
  from auth.users auth_user
  left join public.atsrs_subscriptions subscription on subscription.user_id = auth_user.id
  where auth_user.id = p_user_id;

  selected_plan := coalesce(nullif(lower(p_preview_plan),''), assigned_plan, 'free');
  if selected_plan not in ('free','bronze','silver','titan','gold') then
    raise exception using errcode = '22023', message = 'ATSRS_PLAN_INVALID';
  end if;

  select jsonb_build_object(
    'user_id', p_user_id,
    'assigned_plan', assigned_plan,
    'selected_plan', selected_plan,
    'services', coalesce(jsonb_agg(jsonb_build_object(
      'key', service.service_key,
      'name', service.display_name,
      'unit', service.unit_label,
      'plan_default', coalesce(plan.allowance,0),
      'purchased', coalesce(purchase.quantity,0),
      'manual', coalesce(adjustment.quantity,0),
      'used', atsrs_private.atsrs_entitlement_used(p_user_id, selected_plan, service.service_key),
      'available', greatest(0, coalesce(plan.allowance,0) + coalesce(purchase.quantity,0)
        + coalesce(adjustment.quantity,0)
        - atsrs_private.atsrs_entitlement_used(p_user_id, selected_plan, service.service_key))
    ) order by service.sort_order),'[]'::jsonb)
  ) into result
  from atsrs_private.atsrs_entitlement_services service
  left join atsrs_private.atsrs_plan_entitlements plan
    on plan.plan_key = selected_plan and plan.service_key = service.service_key
  left join atsrs_private.atsrs_account_entitlement_purchases purchase
    on purchase.user_id = p_user_id and purchase.service_key = service.service_key
  left join atsrs_private.atsrs_account_entitlement_adjustments adjustment
    on adjustment.user_id = p_user_id and adjustment.service_key = service.service_key
  where service.active;
  return result;
end
$function$;

create or replace function public.atsrs_admin_set_account_plan(
  p_user_id uuid,
  p_plan_key text,
  p_reason text default 'Owner plan assignment'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_plan text := lower(btrim(coalesce(p_plan_key,'')));
  previous_plan text;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;
  if normalized_plan not in ('free','bronze','silver','titan','gold') then
    raise exception using errcode = '22023', message = 'ATSRS_PLAN_INVALID';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'ATSRS_REASON_INVALID';
  end if;
  if not exists (select 1 from public.atsrs_workspaces where user_id = p_user_id and account_type = 'personal') then
    raise exception using errcode = '22023', message = 'ATSRS_PERSONAL_ACCOUNT_REQUIRED';
  end if;
  select plan into previous_plan from public.atsrs_subscriptions where user_id = p_user_id;
  insert into public.atsrs_subscriptions(user_id,plan,status,updated_at)
  values (p_user_id,normalized_plan,'active',now())
  on conflict (user_id) do update set plan=excluded.plan,status='active',updated_at=now();
  insert into atsrs_private.atsrs_entitlement_audit_log
    (actor_user_id,target_user_id,action,plan_key,reason)
  values (actor_id,p_user_id,'account_plan',normalized_plan,btrim(p_reason));
  update public.atsrs_talent_profiles profile set discoverable=false,updated_at=now()
  where profile.user_id=p_user_id and profile.discoverable
    and (select effective_limit from atsrs_private.atsrs_effective_entitlement_limit(p_user_id,'candidate_directory_visibility'))<1;
  return public.atsrs_admin_account_entitlements(p_user_id,normalized_plan);
end
$function$;

create or replace function public.atsrs_admin_adjust_account_entitlement(
  p_user_id uuid,
  p_service_key text,
  p_source_bucket text,
  p_delta integer,
  p_reason text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_service text := lower(btrim(coalesce(p_service_key,'')));
  normalized_source text := lower(btrim(coalesce(p_source_bucket,'')));
  previous_quantity integer := 0;
  next_quantity integer;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;
  if p_delta = 0 or abs(p_delta) > 100000 then
    raise exception using errcode = '22023', message = 'ATSRS_ADJUSTMENT_INVALID';
  end if;
  if normalized_source not in ('purchased','manual') then
    raise exception using errcode = '22023', message = 'ATSRS_SOURCE_INVALID';
  end if;
  if not exists (select 1 from atsrs_private.atsrs_entitlement_services where service_key=normalized_service and active) then
    raise exception using errcode = '22023', message = 'ATSRS_SERVICE_INVALID';
  end if;
  if not exists (select 1 from public.atsrs_workspaces where user_id=p_user_id and account_type='personal') then
    raise exception using errcode = '22023', message = 'ATSRS_PERSONAL_ACCOUNT_REQUIRED';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 2 and 120
     or char_length(coalesce(p_notes,'')) > 1000 then
    raise exception using errcode = '22023', message = 'ATSRS_REASON_INVALID';
  end if;

  if normalized_source = 'purchased' then
    select coalesce(quantity,0) into previous_quantity
      from atsrs_private.atsrs_account_entitlement_purchases
      where user_id=p_user_id and service_key=normalized_service for update;
    next_quantity := greatest(0, previous_quantity + p_delta);
    insert into atsrs_private.atsrs_account_entitlement_purchases
      (user_id,service_key,quantity,updated_by,updated_at)
    values (p_user_id,normalized_service,next_quantity,actor_id,now())
    on conflict (user_id,service_key) do update set
      quantity=excluded.quantity,updated_by=excluded.updated_by,updated_at=now();
  else
    select coalesce(quantity,0) into previous_quantity
      from atsrs_private.atsrs_account_entitlement_adjustments
      where user_id=p_user_id and service_key=normalized_service for update;
    next_quantity := greatest(-1000000,least(1000000,previous_quantity+p_delta));
    insert into atsrs_private.atsrs_account_entitlement_adjustments
      (user_id,service_key,quantity,updated_by,updated_at)
    values (p_user_id,normalized_service,next_quantity,actor_id,now())
    on conflict (user_id,service_key) do update set
      quantity=excluded.quantity,updated_by=excluded.updated_by,updated_at=now();
  end if;

  insert into atsrs_private.atsrs_entitlement_audit_log
    (actor_user_id,target_user_id,action,service_key,source_bucket,previous_quantity,
     change_quantity,new_quantity,reason,notes)
  values (actor_id,p_user_id,'account_adjustment',normalized_service,normalized_source,
    previous_quantity,p_delta,next_quantity,btrim(p_reason),nullif(btrim(coalesce(p_notes,'')),''));
  if normalized_service='candidate_directory_visibility' then
    update public.atsrs_talent_profiles profile set discoverable=false,updated_at=now()
    where profile.user_id=p_user_id and profile.discoverable
      and (select effective_limit from atsrs_private.atsrs_effective_entitlement_limit(p_user_id,normalized_service))<1;
  end if;
  return public.atsrs_admin_account_entitlements(p_user_id,null);
end
$function$;

create or replace function public.atsrs_admin_reset_account_entitlement(
  p_user_id uuid,
  p_service_key text,
  p_reason text default 'Reset manual adjustment to plan default'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_service text := lower(btrim(coalesce(p_service_key,'')));
  previous_quantity integer := 0;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;
  select coalesce(quantity,0) into previous_quantity
  from atsrs_private.atsrs_account_entitlement_adjustments
  where user_id=p_user_id and service_key=normalized_service for update;
  insert into atsrs_private.atsrs_account_entitlement_adjustments
    (user_id,service_key,quantity,updated_by,updated_at)
  values (p_user_id,normalized_service,0,actor_id,now())
  on conflict (user_id,service_key) do update set quantity=0,updated_by=actor_id,updated_at=now();
  insert into atsrs_private.atsrs_entitlement_audit_log
    (actor_user_id,target_user_id,action,service_key,source_bucket,previous_quantity,
     change_quantity,new_quantity,reason)
  values (actor_id,p_user_id,'account_reset',normalized_service,'manual',previous_quantity,
    -previous_quantity,0,btrim(p_reason));
  if normalized_service='candidate_directory_visibility' then
    update public.atsrs_talent_profiles profile set discoverable=false,updated_at=now()
    where profile.user_id=p_user_id and profile.discoverable
      and (select effective_limit from atsrs_private.atsrs_effective_entitlement_limit(p_user_id,normalized_service))<1;
  end if;
  return public.atsrs_admin_account_entitlements(p_user_id,null);
end
$function$;

create or replace function public.atsrs_admin_set_plan_entitlement(
  p_plan_key text,
  p_service_key text,
  p_allowance integer,
  p_reason text default 'Owner plan default update'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_plan text := lower(btrim(coalesce(p_plan_key,'')));
  normalized_service text := lower(btrim(coalesce(p_service_key,'')));
  previous_quantity integer := 0;
begin
  if not atsrs_private.atsrs_is_entitlement_admin(actor_id) then
    raise exception using errcode = '42501', message = 'ATSRS_ADMIN_REQUIRED';
  end if;
  if normalized_plan not in ('free','bronze','silver','titan','gold') or p_allowance not between 0 and 1000000 then
    raise exception using errcode = '22023', message = 'ATSRS_PLAN_ENTITLEMENT_INVALID';
  end if;
  if not exists (select 1 from atsrs_private.atsrs_entitlement_services where service_key=normalized_service and active) then
    raise exception using errcode = '22023', message = 'ATSRS_SERVICE_INVALID';
  end if;
  select coalesce(allowance,0) into previous_quantity
  from atsrs_private.atsrs_plan_entitlements
  where plan_key=normalized_plan and service_key=normalized_service for update;
  insert into atsrs_private.atsrs_plan_entitlements(plan_key,service_key,allowance,updated_by,updated_at)
  values (normalized_plan,normalized_service,p_allowance,actor_id,now())
  on conflict (plan_key,service_key) do update set allowance=excluded.allowance,updated_by=actor_id,updated_at=now();
  insert into atsrs_private.atsrs_entitlement_audit_log
    (actor_user_id,action,plan_key,service_key,previous_quantity,change_quantity,new_quantity,reason)
  values (actor_id,'plan_default',normalized_plan,normalized_service,previous_quantity,
    p_allowance-previous_quantity,p_allowance,btrim(p_reason));
  if normalized_service='candidate_directory_visibility' and p_allowance<1 then
    update public.atsrs_talent_profiles profile set discoverable=false,updated_at=now()
    from public.atsrs_subscriptions subscription
    where subscription.user_id=profile.user_id and subscription.plan=normalized_plan and profile.discoverable
      and (select effective_limit from atsrs_private.atsrs_effective_entitlement_limit(profile.user_id,normalized_service))<1;
  end if;
  return jsonb_build_object('plan',normalized_plan,'service',normalized_service,'allowance',p_allowance);
end
$function$;

create or replace function atsrs_private.atsrs_effective_entitlement_limit(
  p_user_id uuid,
  p_service_key text
)
returns table (
  plan_key text,
  plan_default integer,
  purchased integer,
  manual integer,
  effective_limit integer
)
language sql
stable
security definer
set search_path = ''
as $function$
  with account as (
    select coalesce(subscription.plan,'free') as plan_key
    from (select p_user_id as user_id) target
    left join public.atsrs_subscriptions subscription on subscription.user_id=target.user_id
  )
  select account.plan_key,
    coalesce(plan.allowance,0)::integer,
    coalesce(purchase.quantity,0)::integer,
    coalesce(adjustment.quantity,0)::integer,
    greatest(0,coalesce(plan.allowance,0)+coalesce(purchase.quantity,0)+coalesce(adjustment.quantity,0))::integer
  from account
  left join atsrs_private.atsrs_plan_entitlements plan
    on plan.plan_key=account.plan_key and plan.service_key=p_service_key
  left join atsrs_private.atsrs_account_entitlement_purchases purchase
    on purchase.user_id=p_user_id and purchase.service_key=p_service_key
  left join atsrs_private.atsrs_account_entitlement_adjustments adjustment
    on adjustment.user_id=p_user_id and adjustment.service_key=p_service_key
$function$;

revoke all on function atsrs_private.atsrs_effective_entitlement_limit(uuid,text)
  from public, anon, authenticated;
grant execute on function atsrs_private.atsrs_effective_entitlement_limit(uuid,text)
  to service_role;

-- AI scan enforcement now reads only the canonical entitlement model.
create or replace function public.atsrs_reserve_ai_scan(p_user_id uuid)
returns table (plan text,used integer,scan_limit integer,remaining integer,allowed boolean,reason text)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_plan text;
  v_limit integer;
  v_used integer := 0;
  v_rows integer;
  v_period date;
begin
  if p_user_id is null then raise exception 'A user id is required.' using errcode='22023'; end if;
  select resolved.plan_key,resolved.effective_limit into v_plan,v_limit
  from atsrs_private.atsrs_effective_entitlement_limit(p_user_id,'ai_document_scans') resolved;
  v_plan:=coalesce(v_plan,'free');v_limit:=coalesce(v_limit,0);
  v_period:=case when v_plan='free' then date '1970-01-01' else date_trunc('month',timezone('UTC',now()))::date end;
  select coalesce(scan_count,0) into v_used from public.atsrs_ai_scan_usage
  where user_id=p_user_id and period_start=v_period;
  if coalesce(v_used,0)>=v_limit then
    return query select v_plan,coalesce(v_used,0),v_limit,0,false,'entitlement_limit'::text;return;
  end if;
  insert into public.atsrs_ai_scan_usage as usage(user_id,period_start,scan_count,updated_at)
  values(p_user_id,v_period,1,now())
  on conflict(user_id,period_start) do update set scan_count=usage.scan_count+1,updated_at=now()
  where usage.scan_count<v_limit and usage.updated_at<=now()-interval '8 seconds'
  returning scan_count into v_used;
  get diagnostics v_rows=row_count;
  if v_rows=0 then
    select coalesce(scan_count,0) into v_used from public.atsrs_ai_scan_usage
    where user_id=p_user_id and period_start=v_period;
    return query select v_plan,coalesce(v_used,0),v_limit,greatest(v_limit-coalesce(v_used,0),0),false,
      case when coalesce(v_used,0)>=v_limit then 'entitlement_limit' else 'cooldown' end;return;
  end if;
  return query select v_plan,v_used,v_limit,greatest(v_limit-v_used,0),true,'reserved'::text;
end
$function$;

revoke all on function public.atsrs_reserve_ai_scan(uuid) from public,anon,authenticated;
grant execute on function public.atsrs_reserve_ai_scan(uuid) to service_role;

-- AI CV enforcement now reads only the canonical entitlement model.
create or replace function public.atsrs_reserve_ai_cv(p_user_id uuid)
returns table (plan text,used integer,generation_limit integer,remaining integer,allowed boolean,reason text)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_plan text;
  v_limit integer;
  v_used integer := 0;
  v_rows integer;
  v_period date;
begin
  if p_user_id is null then raise exception 'A user id is required.' using errcode='22023'; end if;
  select resolved.plan_key,resolved.effective_limit into v_plan,v_limit
  from atsrs_private.atsrs_effective_entitlement_limit(p_user_id,'ai_cv_generations') resolved;
  v_plan:=coalesce(v_plan,'free');v_limit:=coalesce(v_limit,0);
  v_period:=case when v_plan='free' then date '1970-01-01' else date_trunc('month',timezone('UTC',now()))::date end;
  select coalesce(generation_count,0) into v_used from public.atsrs_ai_cv_usage
  where user_id=p_user_id and period_start=v_period;
  if coalesce(v_used,0)>=v_limit then
    return query select v_plan,coalesce(v_used,0),v_limit,0,false,'generation_limit'::text;return;
  end if;
  insert into public.atsrs_ai_cv_usage as usage(user_id,period_start,generation_count,updated_at)
  values(p_user_id,v_period,1,now())
  on conflict(user_id,period_start) do update set generation_count=usage.generation_count+1,updated_at=now()
  where usage.generation_count<v_limit and usage.updated_at<=now()-interval '15 seconds'
  returning generation_count into v_used;
  get diagnostics v_rows=row_count;
  if v_rows=0 then
    select coalesce(generation_count,0) into v_used from public.atsrs_ai_cv_usage
    where user_id=p_user_id and period_start=v_period;
    return query select v_plan,coalesce(v_used,0),v_limit,greatest(v_limit-coalesce(v_used,0),0),false,
      case when coalesce(v_used,0)>=v_limit then 'generation_limit' else 'cooldown' end;return;
  end if;
  return query select v_plan,v_used,v_limit,greatest(v_limit-v_used,0),true,'reserved'::text;
end
$function$;

revoke all on function public.atsrs_reserve_ai_cv(uuid) from public,anon,authenticated;
grant execute on function public.atsrs_reserve_ai_cv(uuid) to service_role;

-- Stored-document enforcement uses the same resolver as the Admin screen.
create or replace function public.atsrs_enforce_file_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_plan text;v_limit integer;v_count integer;
begin
  if new.account_type<>'personal' then return new; end if;
  select resolved.plan_key,resolved.effective_limit into v_plan,v_limit
  from atsrs_private.atsrs_effective_entitlement_limit(new.user_id,'stored_documents') resolved;
  select count(*)::integer into v_count from public.atsrs_files file_row
  where file_row.user_id=new.user_id and file_row.account_type=new.account_type;
  if v_count>=coalesce(v_limit,0) then
    raise exception 'ATSRS % plan stored-document limit reached (% documents).',initcap(coalesce(v_plan,'free')),coalesce(v_limit,0)
      using errcode='P0001';
  end if;
  return new;
end
$function$;

revoke all on function public.atsrs_enforce_file_plan_limit() from public,anon,authenticated;

-- Recipient Links reads the same plan + purchased + manual result.
create or replace function public.atsrs_get_recipient_share_entitlement(p_owner_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'enabled',resolved.effective_limit>0,
    'active_limit',least(resolved.effective_limit,100),
    'source','plan_and_account'
  )
  from atsrs_private.atsrs_effective_entitlement_limit(p_owner_user_id,'recipient_share_links') resolved
$function$;

revoke all on function public.atsrs_get_recipient_share_entitlement(uuid) from public,anon,authenticated;
grant execute on function public.atsrs_get_recipient_share_entitlement(uuid) to service_role;

-- Keep the existing service-role canary/billing setter, but write into the
-- canonical purchased bucket instead of a second entitlement source.
create or replace function public.atsrs_set_recipient_share_entitlement(
  p_owner_user_id uuid,
  p_enabled boolean,
  p_active_limit smallint,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  resolved record;
  purchased_quantity integer;
begin
  if p_owner_user_id is null or p_active_limit not between 0 and 100 or p_source not in ('canary','billing') then
    raise exception using errcode='22023',message='ATSRS_RECIPIENT_ENTITLEMENT_INVALID';
  end if;
  select * into resolved from atsrs_private.atsrs_effective_entitlement_limit(p_owner_user_id,'recipient_share_links');
  purchased_quantity:=case when p_enabled then greatest(0,p_active_limit-resolved.plan_default-resolved.manual) else 0 end;
  insert into atsrs_private.atsrs_account_entitlement_purchases(user_id,service_key,quantity,updated_at)
  values(p_owner_user_id,'recipient_share_links',purchased_quantity,now())
  on conflict(user_id,service_key) do update set quantity=excluded.quantity,updated_at=now();
  return public.atsrs_get_recipient_share_entitlement(p_owner_user_id);
end
$function$;

revoke all on function public.atsrs_set_recipient_share_entitlement(uuid,boolean,smallint,text)
  from public,anon,authenticated;
grant execute on function public.atsrs_set_recipient_share_entitlement(uuid,boolean,smallint,text)
  to service_role;

-- Public Candidate visibility is allowed only when the resolved account limit
-- includes directory access (Bronze or higher by default, or an account grant).
create or replace function public.enforce_atsrs_talent_profile_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare directory_limit integer:=0;
begin
  select resolved.effective_limit into directory_limit
  from atsrs_private.atsrs_effective_entitlement_limit(new.user_id,'candidate_directory_visibility') resolved;
  if new.profile_visibility<>'Public' or coalesce(directory_limit,0)<1 then new.discoverable:=false; end if;
  return new;
end
$function$;

revoke all on function public.enforce_atsrs_talent_profile_visibility()
  from public,anon,authenticated;

update public.atsrs_talent_profiles profile set discoverable=false,updated_at=now()
where profile.discoverable and
  (select effective_limit from atsrs_private.atsrs_effective_entitlement_limit(profile.user_id,'candidate_directory_visibility'))<1;

revoke all on function public.atsrs_admin_entitlements_bootstrap(text) from public, anon;
revoke all on function public.atsrs_admin_account_entitlements(uuid,text) from public, anon;
revoke all on function public.atsrs_admin_set_account_plan(uuid,text,text) from public, anon;
revoke all on function public.atsrs_admin_adjust_account_entitlement(uuid,text,text,integer,text,text) from public, anon;
revoke all on function public.atsrs_admin_reset_account_entitlement(uuid,text,text) from public, anon;
revoke all on function public.atsrs_admin_set_plan_entitlement(text,text,integer,text) from public, anon;

grant execute on function public.atsrs_admin_entitlements_bootstrap(text) to authenticated;
grant execute on function public.atsrs_admin_account_entitlements(uuid,text) to authenticated;
grant execute on function public.atsrs_admin_set_account_plan(uuid,text,text) to authenticated;
grant execute on function public.atsrs_admin_adjust_account_entitlement(uuid,text,text,integer,text,text) to authenticated;
grant execute on function public.atsrs_admin_reset_account_entitlement(uuid,text,text) to authenticated;
grant execute on function public.atsrs_admin_set_plan_entitlement(text,text,integer,text) to authenticated;

commit;
