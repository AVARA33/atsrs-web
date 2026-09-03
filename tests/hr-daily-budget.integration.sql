begin;
set local role service_role;
do $$
declare r uuid; first_call uuid; next_call uuid; day_used numeric; month_used numeric; logged integer;
begin
 insert into public.atsrs_job_ingestion_runs(billing_scope) values('hr_management') returning id into r;
 select coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)),0) into day_used from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs x on x.id=c.run_id where x.billing_scope='hr_management' and c.created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
 update public.atsrs_job_ingestion_config set enabled=true,lease_id=r,lease_until=now()+interval '5 minutes',daily_limit=day_used+0.039,monthly_limit=15;
 first_call:=public.atsrs_job_reserve(r,'Eurofins','daily-budget-transaction-test');
 if first_call is null then raise exception 'Expected first reservation'; end if;
 next_call:=public.atsrs_job_reserve(r,'Eurofins','daily-budget-block-test');
 if next_call is not null then raise exception 'Daily ceiling exceeded'; end if;
 select count(*) into logged from public.atsrs_hr_budget_days where day=(now() at time zone 'Asia/Baku')::date and first_paused_at is not null;
 if logged<>1 then raise exception 'Pause timestamp not recorded'; end if;
 select coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)),0) into month_used from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs x on x.id=c.run_id where x.billing_scope='hr_management' and c.created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
 update public.atsrs_job_ingestion_config set daily_limit=15,monthly_limit=month_used+0.019;
 next_call:=public.atsrs_job_reserve(r,'Eurofins','monthly-budget-block-test');
 if next_call is not null then raise exception 'Monthly ceiling exceeded'; end if;
end $$;
rollback;
