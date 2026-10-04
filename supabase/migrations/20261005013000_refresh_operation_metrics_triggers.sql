create or replace function public.refresh_operation_metrics_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('DELETE','UPDATE') then
    update public.operations o
       set attendance_total = (select count(*) from public.roster_assignments r where r.operation_id = old.operation_id),
           attendance_confirmed = (select count(*) from public.roster_assignments r where r.operation_id = old.operation_id and r.attendance = 'going'),
           briefing_total = (select count(*) from public.briefings b where b.operation_id = old.operation_id),
           briefing_published = (select count(*) from public.briefings b where b.operation_id = old.operation_id and b.published_at is not null),
           updated_at = now()
     where o.id = old.operation_id;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    update public.operations o
       set attendance_total = (select count(*) from public.roster_assignments r where r.operation_id = new.operation_id),
           attendance_confirmed = (select count(*) from public.roster_assignments r where r.operation_id = new.operation_id and r.attendance = 'going'),
           briefing_total = (select count(*) from public.briefings b where b.operation_id = new.operation_id),
           briefing_published = (select count(*) from public.briefings b where b.operation_id = new.operation_id and b.published_at is not null),
           updated_at = now()
     where o.id = new.operation_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_operation_metrics_trigger() from public, anon, authenticated;

drop trigger if exists trg_refresh_operation_metrics_roster on public.roster_assignments;
create trigger trg_refresh_operation_metrics_roster
after insert or update or delete on public.roster_assignments
for each row execute function public.refresh_operation_metrics_trigger();

drop trigger if exists trg_refresh_operation_metrics_briefings on public.briefings;
create trigger trg_refresh_operation_metrics_briefings
after insert or update or delete on public.briefings
for each row execute function public.refresh_operation_metrics_trigger();